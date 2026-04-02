/**
 * /api/jobs/nightly — Vercel cron endpoint (Phase 4)
 *
 * Called nightly by Vercel Cron. Publishes all nightly jobs to QStash
 * for durable, retried execution. Each job runs independently.
 *
 * vercel.json cron: "0 4 * * *" (4 AM UTC)
 */
import { publishJob } from "@/lib/qstash";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get all active tenant/location pairs
  const { data: locations, error } = await supabaseAdmin
    .from("locations")
    .select("id, tenant_id")
    .limit(500);

  if (error || !locations) {
    console.error("nightly: failed to load locations", error?.message);
    return new Response("Failed to load locations", { status: 500 });
  }

  const runDate = new Date().toISOString().slice(0, 10);
  const results: { job: string; location_id: string; status: string }[] = [];

  for (const loc of locations) {
    for (const job of ["forecast", "variance", "generate-pos"] as const) {
      try {
        await publishJob(job, { tenantId: loc.tenant_id, locationId: loc.id, date: runDate });
        results.push({ job, location_id: loc.id, status: "queued" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown";
        console.error(`nightly: failed to queue ${job} for ${loc.id}`, msg);
        results.push({ job, location_id: loc.id, status: `error: ${msg}` });
      }
    }
  }

  // Queue weekly digest (once per nightly run, not per location)
  try {
    await publishJob("weekly-digest", { date: runDate });
    results.push({ job: "weekly-digest", location_id: "*", status: "queued" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    results.push({ job: "weekly-digest", location_id: "*", status: `error: ${msg}` });
  }

  console.info("nightly cron complete", { locations: locations.length, jobs: results.length });
  return Response.json({ ok: true, date: runDate, jobs: results });
}
