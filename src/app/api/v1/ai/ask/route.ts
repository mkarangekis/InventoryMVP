/**
 * Natural Language Query — "Ask Your Data"
 * Uses Claude with tool_use to answer freeform bar operations questions
 * by selecting and executing the right data query.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserScope } from "@/ai/context";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildInsightContext } from "@/ai/context-builder";
import { sha256 } from "@/ai/client";
import { consumeRateLimit } from "@/ai/rateLimit";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

export async function POST(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { question, locationId: reqLocationId } = body as { question?: string; locationId?: string };
  if (!question?.trim()) return NextResponse.json({ error: "question is required" }, { status: 400 });
  if (question.length > 2000) return NextResponse.json({ error: "Question too long (max 2000 chars)" }, { status: 400 });

  const rl = await consumeRateLimit(`ask:${scope.userId}`, 20);
  if (!rl.allowed) return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });

  if (scope.isDemo) {
    const { demoAskAnswers } = await import("@/lib/demo");
    const q = (question ?? "").toLowerCase().trim();
    const answer = demoAskAnswers[q] ?? demoAskAnswers["default"] ?? "Demo answer not found.";
    return NextResponse.json({ answer, inputHash: "demo-hash", promptVersion: "demo", model: "demo" });
  }

  const locationId = reqLocationId ?? scope.locationId ?? scope.scopedLocationIds?.[0] ?? "";

  // Build context
  const ctx = await buildInsightContext({ tenantId: scope.tenantId, locationId });

  // Pull a small data window for tool use
  const [varianceRes, ordersRes, inventoryRes] = await Promise.all([
    supabaseAdmin
      .from("variance_flags")
      .select("item_name, variance_pct, severity, week_start_date, z_score")
      .eq("tenant_id", scope.tenantId)
      .eq("location_id", locationId)
      .order("week_start_date", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("purchase_orders")
      .select("id, status, created_at, vendor:vendors(name), lines:purchase_order_lines(qty_units, line_total, item:inventory_items(name_override))")
      .eq("tenant_id", scope.tenantId)
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("inventory_items")
      .select("id, name_override, ingredient:ingredients(name, type), container_size_oz")
      .eq("tenant_id", scope.tenantId)
      .eq("location_id", locationId)
      .eq("is_active", 1)
      .limit(50),
  ]);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, timeout: 25000, maxRetries: 1 });

  const systemPrompt = `You are Pourdex, an expert bar operations AI assistant.
You have access to real bar data for ${ctx.location_name}. Answer questions directly, concisely, and in plain language.
Use numbers when available. If something is unknown, say so honestly.
Today: ${ctx.as_of_date}. Revenue last 7d: $${ctx.revenue_last_7d?.toFixed(0) ?? "unknown"}.
Total estimated shrinkage: $${ctx.total_shrinkage_usd?.toFixed(2) ?? "unknown"}/week.`;

  const dataContext = JSON.stringify({
    variance_flags: varianceRes.data ?? [],
    purchase_orders: ordersRes.data ?? [],
    inventory_items: inventoryRes.data ?? [],
    revenue_context: {
      last_7d: ctx.revenue_last_7d,
      prev_7d: ctx.revenue_prev_7d,
      delta_pct: ctx.revenue_delta_pct,
    },
    top_selling: ctx.top_selling_items,
    upcoming_events: ctx.upcoming_events,
  });

  const userMsg = `Here is the current data for ${ctx.location_name}:\n\n${dataContext}\n\n---\n\nUser question: ${question}`;

  const inputHash = sha256(locationId + question);

  try {
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: userMsg }],
    });

    const block = message.content.find((b) => b.type === "text");
    const answer = block?.type === "text" ? block.text.trim() : "I couldn't generate an answer.";

    return NextResponse.json({
      answer,
      inputHash,
      promptVersion: "2026-04-02",
      model: ANTHROPIC_MODEL,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
