import { supabaseAdmin } from "@/lib/supabase/admin";
import { SquareAdapter } from "@/lib/pos/adapters/square";
import { runImport } from "@/lib/pos/run-import";

// Nightly pull job — called by cron or internal secret
// Fetches the past 24h of Square orders for all active connections (or a specific one)
export async function POST(request: Request) {
  const internalSecret = request.headers.get("x-internal-secret");
  if (!internalSecret || internalSecret !== process.env.INTERNAL_JOB_SECRET || !process.env.INTERNAL_JOB_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as { locationId?: string; from?: string; to?: string };
  const { locationId } = body;

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const from = body.from ?? yesterday;
  const to = body.to ?? today;

  // Fetch active Square connections (filtered by locationId if provided)
  const query = supabaseAdmin
    .from("pos_connections")
    .select("id,location_id,tenant_id:locations!inner(tenant_id),square_access_token,square_location_id")
    .eq("pos_type", "square")
    .eq("status", "active");

  if (locationId) query.eq("location_id", locationId);

  const { data: connections, error } = await query;
  if (error) return new Response(error.message, { status: 500 });
  if (!connections || connections.length === 0) {
    return Response.json({ ok: true, message: "No active Square connections." });
  }

  const baseUrl = new URL(request.url).origin;
  const results = [];

  for (const conn of connections) {
    const connLocationId = conn.location_id as string;
    const connTenantId = (conn.tenant_id as unknown as { tenant_id: string })?.tenant_id ?? "";
    const accessToken = conn.square_access_token as string;
    const squareLocationId = conn.square_location_id as string;

    if (!accessToken || !squareLocationId || !connTenantId) continue;

    const adapter = new SquareAdapter({ accessToken, squareLocationId });

    try {
      // Pre-fetch orders so adapter caches them
      await adapter.importOrders({ from, to });

      const result = await runImport({
        tenantId: connTenantId,
        locationId: connLocationId,
        source: "square",
        adapter,
        triggerJobs: { baseUrl, from, to },
      });

      await supabaseAdmin
        .from("pos_connections")
        .update({ last_import_at: new Date().toISOString(), status: "active", last_error: null })
        .eq("id", conn.id);

      results.push({ locationId: connLocationId, ok: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await supabaseAdmin
        .from("pos_connections")
        .update({ last_error: message, status: "error" })
        .eq("id", conn.id);
      results.push({ locationId: connLocationId, ok: false, error: message });
      console.error("square-pull failed", { locationId: connLocationId, message });
    }
  }

  return Response.json({ ok: true, results });
}
