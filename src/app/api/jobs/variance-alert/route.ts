/**
 * /api/jobs/variance-alert — Immediate variance alert (Phase 5)
 *
 * Called by the variance job (via QStash) when new high-severity flags
 * are created. Sends alert emails to tenant users.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyQStashSignature } from "@/lib/qstash";
import { sendVarianceAlert } from "@/lib/email";

type AlertPayload = {
  tenantId: string;
  locationId: string;
  weekStartDate: string;
};

export async function POST(request: Request) {
  const cloned = request.clone();
  const valid = await verifyQStashSignature(request);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  let payload: AlertPayload;
  try {
    payload = await cloned.json() as AlertPayload;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { tenantId, locationId, weekStartDate } = payload;

  // Get location name
  const { data: location } = await supabaseAdmin
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .single();

  // Get high/medium variance flags
  const { data: flags } = await supabaseAdmin
    .from("variance_flags")
    .select("inventory_item_id, variance_pct, z_score, severity")
    .eq("location_id", locationId)
    .eq("week_start_date", weekStartDate)
    .in("severity", ["high", "medium"])
    .order("severity")
    .limit(20);

  if (!flags || flags.length === 0) {
    return Response.json({ ok: true, skipped: "no flags" });
  }

  // Resolve item names
  const itemIds = flags.map((f) => f.inventory_item_id);
  const { data: items } = await supabaseAdmin
    .from("inventory_items")
    .select("id, name_override, ingredient_id")
    .in("id", itemIds);
  const ingIds = Array.from(new Set((items ?? []).map((i) => i.ingredient_id)));
  const { data: ings } = ingIds.length
    ? await supabaseAdmin.from("ingredients").select("id, name").in("id", ingIds)
    : { data: [] };
  const ingMap = new Map((ings ?? []).map((g) => [g.id, g.name]));
  const nameMap = new Map((items ?? []).map((i) => [i.id, i.name_override || ingMap.get(i.ingredient_id) || i.id]));

  // Get baselines for trend
  const { data: baselines } = await supabaseAdmin
    .from("variance_baselines")
    .select("inventory_item_id, trend_slope")
    .eq("location_id", locationId)
    .eq("tenant_id", tenantId)
    .in("inventory_item_id", itemIds);
  const slopeMap = new Map((baselines ?? []).map((b) => [b.inventory_item_id, Number(b.trend_slope)]));

  // Shrinkage estimate (rough)
  const totalShrinkageUsd = null; // Would need cost data — fine to skip for alerts

  // Get tenant users' emails
  const { data: users } = await supabaseAdmin
    .from("user_profiles")
    .select("email")
    .eq("tenant_id", tenantId);

  const emails = (users ?? []).map((u) => u.email).filter(Boolean);
  if (emails.length === 0) return Response.json({ ok: true, skipped: "no users" });

  const alertItems = flags.map((f) => ({
    item: nameMap.get(f.inventory_item_id) ?? "Unknown",
    variance_pct: Number(f.variance_pct ?? 0),
    z_score: f.z_score !== null ? Number(f.z_score) : null,
    severity: f.severity ?? "medium",
    trend: slopeMap.has(f.inventory_item_id)
      ? (slopeMap.get(f.inventory_item_id)! > 0.5 ? "↑ Worsening" : slopeMap.get(f.inventory_item_id)! < -0.5 ? "↓ Improving" : "→ Stable")
      : "Unknown",
  }));

  const sent: string[] = [];
  const errors: string[] = [];

  for (const email of emails) {
    try {
      await sendVarianceAlert({
        to: email,
        locationName: location?.name ?? locationId,
        items: alertItems,
        totalShrinkageUsd,
        weekStartDate,
      });
      sent.push(email);
    } catch (err) {
      errors.push(`${email}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  return Response.json({ ok: true, sent: sent.length, errors });
}
