/**
 * /api/jobs/weekly-digest — Weekly email digest (Phase 5)
 *
 * Fetches per-tenant summary data and sends weekly digest emails
 * via Resend to all users with email notification preferences.
 * Called by the QStash job runner every Sunday.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyQStashSignature } from "@/lib/qstash";
import { sendWeeklyDigest } from "@/lib/email";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export async function POST(request: Request) {
  const cloned = request.clone();
  const valid = await verifyQStashSignature(request);
  if (!valid) return new Response("Unauthorized", { status: 401 });

  let payload: { tenantId?: string } = {};
  try { payload = await cloned.json(); } catch { /* ok */ }

  const weekStart = daysAgo(7);
  const prevStart = daysAgo(14);

  // Load all tenants (or just the one specified)
  const tenantsQ = supabaseAdmin.from("tenants").select("id,name").limit(100);
  if (payload.tenantId) tenantsQ.eq("id", payload.tenantId);
  const { data: tenants } = await tenantsQ;

  const results: { tenant: string; sent: number; errors: string[] }[] = [];

  for (const tenant of tenants ?? []) {
    const sent: string[] = [];
    const errors: string[] = [];

    // Get locations for this tenant
    const { data: locations } = await supabaseAdmin
      .from("locations")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .limit(50);

    for (const location of locations ?? []) {
      try {
        // Gather metrics
        const [ordersRes, prevRes, flagsRes, usersRes] = await Promise.all([
          supabaseAdmin.from("pos_orders").select("total").eq("location_id", location.id).gte("closed_at", weekStart).eq("status", "closed"),
          supabaseAdmin.from("pos_orders").select("total").eq("location_id", location.id).gte("closed_at", prevStart).lt("closed_at", weekStart).eq("status", "closed"),
          supabaseAdmin.from("variance_flags").select("severity,z_score").eq("location_id", location.id).gte("week_start_date", weekStart),
          supabaseAdmin.from("user_profiles").select("email").eq("tenant_id", tenant.id),
        ]);

        const revenue = (ordersRes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
        const prevRevenue = (prevRes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
        const revenueDelta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
        const allFlags = flagsRes.data ?? [];
        const highFlags = allFlags.filter((f) => f.severity === "high").length;

        // Get baselines for shrinkage estimate
        const { data: baselines } = await supabaseAdmin
          .from("variance_baselines")
          .select("inventory_item_id, rolling_mean_oz")
          .eq("location_id", location.id)
          .eq("tenant_id", tenant.id);

        const avgVarPct = allFlags.length > 0
          ? allFlags.reduce((s, f) => s + (f.z_score !== null ? Number(f.z_score) * 0.05 : 0.08), 0) / allFlags.length
          : 0;
        const totalMeanOz = (baselines ?? []).reduce((s, b) => s + Number(b.rolling_mean_oz), 0);
        const shrinkageUsd = allFlags.length > 0 ? Math.round(totalMeanOz * avgVarPct * 0.12 * 100) / 100 : 0; // rough $0.12/oz est

        const emails = (usersRes.data ?? []).map((u) => u.email).filter(Boolean);
        if (emails.length === 0) continue;

        const weekRange = `${new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

        for (const email of emails) {
          try {
            await sendWeeklyDigest({
              to: email,
              locationName: location.name,
              weekRange,
              revenue,
              revenueDelta: revenueDelta !== null ? Math.round(revenueDelta * 10) / 10 : null,
              varianceFlags: allFlags.length,
              highFlags,
              shrinkageUsd: shrinkageUsd > 0 ? shrinkageUsd : null,
              topWin: revenue > prevRevenue
                ? `Revenue up ${revenueDelta !== null ? `${Math.abs(revenueDelta).toFixed(1)}%` : ""} from last week ($${revenue.toFixed(0)} vs $${prevRevenue.toFixed(0)})`
                : `${allFlags.length === 0 ? "Zero variance flags this week — clean count!" : `${(allFlags.length - highFlags)} low/medium flags managed well`}`,
              topWatchout: highFlags > 0
                ? `${highFlags} high-severity variance flag${highFlags !== 1 ? "s" : ""} — review count schedule and pour standards`
                : revenue < prevRevenue && prevRevenue > 0
                  ? `Revenue down ${Math.abs(revenueDelta ?? 0).toFixed(1)}% from last week — check staffing and menu performance`
                  : "No critical watchouts this week",
              nextAction: highFlags > 0
                ? "Run a spot count on high-severity items and review the variance explain in Pourdex"
                : allFlags.length > 3
                  ? "Increase count frequency on flagged items — biweekly counts recommended"
                  : "Review upcoming events and pre-order for projected demand",
            });
            sent.push(email);
          } catch (err) {
            errors.push(`${email}: ${err instanceof Error ? err.message : "unknown"}`);
          }
        }
      } catch (err) {
        errors.push(`${location.name}: ${err instanceof Error ? err.message : "unknown"}`);
      }
    }

    results.push({ tenant: tenant.name, sent: sent.length, errors });
  }

  return Response.json({ ok: true, results });
}
