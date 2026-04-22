/**
 * /api/jobs/nightly-check — POS import health check
 *
 * Runs at 8 AM UTC via Vercel Cron (see vercel.json).
 * For every location with an active POS connection, checks whether a
 * successful import run exists from the last 12 hours. Sends an alert
 * email via Resend for any that are missing or failed.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendImportFailureAlert } from "@/lib/email";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const windowStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  // All active POS connections
  const { data: connections, error: connErr } = await supabaseAdmin
    .from("pos_connections")
    .select("id,location_id,pos_type,status,last_error,last_import_at")
    .eq("status", "active");

  if (connErr) {
    console.error("nightly-check: failed to load connections", connErr.message);
    return new Response(connErr.message, { status: 500 });
  }

  if (!connections || connections.length === 0) {
    return Response.json({ ok: true, checked: 0, failures: 0 });
  }

  // Get all import runs from the last 12 hours in one query
  const locationIds = [...new Set(connections.map((c) => c.location_id as string))];
  const { data: recentRuns } = await supabaseAdmin
    .from("pos_import_runs")
    .select("location_id,source,status,started_at,error_summary")
    .in("location_id", locationIds)
    .gte("started_at", windowStart)
    .order("started_at", { ascending: false });

  // Index: location_id + source → most recent run
  const runMap = new Map<string, { status: string; started_at: string; error_summary: string | null }>();
  for (const run of recentRuns ?? []) {
    const key = `${run.location_id}:${run.source}`;
    if (!runMap.has(key)) runMap.set(key, run); // already ordered desc, so first = most recent
  }

  // Group failures by location so we send one email per location
  type Failure = { posType: string; lastAttempt: string | null; error: string | null };
  const failuresByLocation = new Map<string, Failure[]>();

  for (const conn of connections) {
    const source = conn.pos_type as string;
    const locationId = conn.location_id as string;
    const key = `${locationId}:${source}`;
    const run = runMap.get(key);

    const failed =
      !run || // no run at all last night
      run.status === "failed" || // ran but failed
      run.status === "processing"; // started but never finished (hung)

    if (failed) {
      const list = failuresByLocation.get(locationId) ?? [];
      list.push({
        posType: source,
        lastAttempt: run?.started_at ?? (conn.last_import_at as string | null),
        error: run?.error_summary ?? (conn.last_error as string | null),
      });
      failuresByLocation.set(locationId, list);
    }
  }

  if (failuresByLocation.size === 0) {
    console.info("nightly-check: all imports healthy", { checked: connections.length });
    return Response.json({ ok: true, checked: connections.length, failures: 0 });
  }

  // Send one alert per location — get location name + tenant users' emails
  const results: { locationId: string; sent: number; error?: string }[] = [];

  for (const [locationId, failures] of failuresByLocation.entries()) {
    try {
      const locationRes = await supabaseAdmin
        .from("locations")
        .select("name,tenant_id")
        .eq("id", locationId)
        .single();

      const tenantId = locationRes.data?.tenant_id as string | undefined;
      const usersRes = tenantId
        ? await supabaseAdmin.from("user_profiles").select("email").eq("tenant_id", tenantId)
        : { data: [] };

      const locationName = locationRes.data?.name ?? locationId;
      const emails = (usersRes.data ?? []).map((u) => u.email as string).filter(Boolean);

      if (emails.length === 0) {
        results.push({ locationId, sent: 0, error: "no user emails found" });
        continue;
      }

      for (const email of emails) {
        await sendImportFailureAlert({ to: email, locationName, failures, date: today });
      }

      console.warn("nightly-check: alert sent", { locationId, locationName, failures: failures.length, emails: emails.length });
      results.push({ locationId, sent: emails.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error("nightly-check: failed to send alert", { locationId, error: msg });
      results.push({ locationId, sent: 0, error: msg });
    }
  }

  return Response.json({
    ok: true,
    checked: connections.length,
    failures: failuresByLocation.size,
    results,
  });
}
