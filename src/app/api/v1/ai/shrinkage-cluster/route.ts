/**
 * Shrinkage Clustering
 * Groups variance-flagged items into behavioral clusters using Claude,
 * enabling "here's WHY items are being lost" vs item-by-item noise.
 *
 * Cluster types: pour_variance | theft_pattern | waste | data_quality | over_spec
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserScope } from "@/ai/context";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sha256 } from "@/ai/client";
import { getCache, setCache, buildCacheKey } from "@/ai/cache";
import { PROMPT_VERSION } from "@/ai/prompts";
import { consumeRateLimit } from "@/ai/rateLimit";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

export type ShrinkageCluster = {
  cluster_id: string;
  label: string;
  type: "pour_variance" | "theft_pattern" | "waste" | "data_quality" | "over_spec" | "other";
  items: string[];
  total_shrinkage_usd: number;
  avg_z_score: number | null;
  description: string;
  recommended_action: string;
  urgency: "high" | "med" | "low";
};

export async function GET(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  const rl = await consumeRateLimit(`shrinkage-cluster:${scope.userId}`, 10);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });

  if (scope.isDemo) {
    const { demoShrinkageClusters } = await import("@/lib/demo");
    return NextResponse.json(demoShrinkageClusters);
  }

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId") ?? scope.locationId ?? scope.scopedLocationIds?.[0] ?? "";

  // Pull variance flags + cost data for last 4 weeks
  const { data: flags } = await supabaseAdmin
    .from("variance_flags")
    .select("item_name, variance_oz, variance_pct, severity, z_score, week_start_date")
    .eq("tenant_id", scope.tenantId)
    .eq("location_id", locationId)
    .gte("week_start_date", new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10))
    .order("week_start_date", { ascending: false });

  if (!flags || flags.length === 0) {
    return NextResponse.json({ clusters: [], message: "No variance flags in last 4 weeks." });
  }

  // Pull cost data
  const { data: costs } = await supabaseAdmin
    .from("ingredient_costs")
    .select("ingredient_id, cost_per_oz, ingredient:ingredients(name)")
    .is("effective_to", null)
    .order("effective_from", { ascending: false });

  const costMap = new Map<string, number>();
  for (const c of costs ?? []) {
    const name = (c.ingredient as unknown as { name: string } | null)?.name;
    if (name && !costMap.has(name)) costMap.set(name, Number(c.cost_per_oz));
  }

  // Enrich flags with USD shrinkage
  const enriched = flags.map((f) => ({
    item: f.item_name as string,
    variance_oz: Number(f.variance_oz),
    variance_pct: Number(f.variance_pct),
    severity: f.severity as string,
    z_score: f.z_score !== null ? Number(f.z_score) : null,
    week: f.week_start_date as string,
    cost_per_oz: costMap.get(f.item_name as string) ?? null,
    shrinkage_usd: costMap.has(f.item_name as string)
      ? Math.abs(Number(f.variance_oz)) * (costMap.get(f.item_name as string) ?? 0)
      : null,
  }));

  const inputHash = sha256(locationId + JSON.stringify(enriched.map((e) => e.item + e.week)));
  const cacheKey = buildCacheKey(["shrinkage-cluster", locationId, inputHash]);
  const cached = await getCache<{ clusters: ShrinkageCluster[] }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, timeout: 25000, maxRetries: 1 });

  const systemPrompt = `You are a bar operations analyst specializing in inventory loss patterns.
Analyze the variance data and group items into meaningful behavioral clusters.
Return ONLY valid JSON. No markdown, no code fences.
Each cluster should explain WHY items are being lost, not just list them.`;

  const userMsg = `Variance flag data for the last 4 weeks:\n${JSON.stringify(enriched, null, 2)}\n\nGroup these into 2–5 shrinkage clusters. For each cluster return:
{
  "cluster_id": "string (slug)",
  "label": "short human label",
  "type": "pour_variance|theft_pattern|waste|data_quality|over_spec|other",
  "items": ["item names"],
  "total_shrinkage_usd": number_or_null,
  "avg_z_score": number_or_null,
  "description": "1-2 sentences explaining the pattern",
  "recommended_action": "specific action to take",
  "urgency": "high|med|low"
}

Return: { "clusters": [...] }`;

  try {
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1500,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });

    const block = message.content.find((b) => b.type === "text");
    const raw = block?.type === "text" ? block.text.trim() : "{}";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: { clusters: ShrinkageCluster[] };
    try {
      parsed = JSON.parse(cleaned) as { clusters: ShrinkageCluster[] };
    } catch {
      return NextResponse.json({ error: "AI returned unparseable response", clusters: [] }, { status: 500 });
    }

    await setCache(cacheKey, parsed, CACHE_TTL);
    return NextResponse.json(parsed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
