import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

type RequestBody = {
  runId?: string;
  locationId?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  if (isDemoEmail(userData.user.email)) {
    return Response.json({ ok: true, message: "Demo: import job queued." });
  }

  const userId = userData.user.id;
  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (profile.error || !profile.data?.tenant_id) {
    return new Response("User profile not found", { status: 403 });
  }

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const allowedLocations = (locations.data ?? []).map((row) => row.location_id);
  if (allowedLocations.length === 0) {
    return Response.json({ message: "No locations available." });
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const runId = body.runId ?? null;
  const locationId =
    body.locationId && allowedLocations.includes(body.locationId)
      ? body.locationId
      : null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new Response("DATABASE_URL is not set", { status: 500 });
  }

  const sql = postgres(databaseUrl, { prepare: false });
  const tenantId = profile.data.tenant_id;

  console.info("api.jobs.import start", { tenantId, locationId, runId });

  try {
    const [jobRun] = await sql`
      insert into job_runs (tenant_id, location_id, job_name, status)
      values (${tenantId}, ${locationId}, 'process-import-run', 'running')
      returning id
    `;

    const runs = await sql`
      select id, tenant_id, location_id, status, started_at
      from pos_import_runs
      where (${runId}::uuid is null or id = ${runId})
        and tenant_id = ${tenantId}
        and (${locationId}::uuid is null or location_id = ${locationId})
        and status in ('pending', 'processing')
      order by started_at asc
      limit 20
    `;

    let completedCount = 0;
    let failedCount = 0;

    for (const row of runs) {
      const [rawCount] = await sql`
        select count(*)::int as count
        from pos_import_rows
        where import_run_id = ${row.id}
      `;

      if ((rawCount?.count ?? 0) > 0) {
        await sql`
          update pos_import_runs
          set status = 'completed',
              finished_at = coalesce(finished_at, now())
          where id = ${row.id}
        `;
        completedCount += 1;
        continue;
      }

      const startedAt = row.started_at ? new Date(row.started_at) : null;
      const stale =
        startedAt && Date.now() - startedAt.getTime() > 30 * 60 * 1000;

      if (stale) {
        await sql`
          update pos_import_runs
          set status = 'failed',
              error_summary = 'No rows loaded within 30 minutes.',
              finished_at = now()
          where id = ${row.id}
        `;
        failedCount += 1;
      }
    }

    await sql`
      update job_runs
      set status = 'completed', finished_at = now(),
          details = ${JSON.stringify({ completedCount, failedCount })}
      where id = ${jobRun.id}
    `;

    console.info("api.jobs.import done", { completedCount, failedCount });

    return Response.json({
      message: "Import runs processed.",
      completedCount,
      failedCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("api.jobs.import failed", message);
    return new Response(message, { status: 500 });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
