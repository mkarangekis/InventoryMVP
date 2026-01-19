import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RequestBody = {
  locationId?: string;
};

const severityCase = `
  case
    when v.variance_pct >= 0.15 then 'high'
    when v.variance_pct >= 0.10 then 'medium'
    when v.variance_pct >= 0.05 then 'low'
    else 'none'
  end
`;

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

  console.info("api.jobs.variance start", { tenantId, locationId });

  try {
    const [jobRun] = await sql`
      insert into job_runs (tenant_id, location_id, job_name, status)
      values (${tenantId}, ${locationId}, 'compute-variance', 'running')
      returning id
    `;

    await sql`
      with latest_snapshot as (
        select distinct on (s.location_id)
          s.id as snapshot_id,
          s.tenant_id,
          s.location_id,
          s.snapshot_date
        from inventory_snapshots s
        where s.tenant_id = ${tenantId}
          and (${locationId}::uuid is null or s.location_id = ${locationId})
        order by s.location_id, s.snapshot_date desc
      ),
      previous_snapshot as (
        select distinct on (s.location_id)
          s.id as snapshot_id,
          s.location_id,
          s.snapshot_date
        from inventory_snapshots s
        join latest_snapshot ls on ls.location_id = s.location_id
        where s.snapshot_date < ls.snapshot_date
        order by s.location_id, s.snapshot_date desc
      ),
      usage_window as (
        select
          ls.location_id,
          ls.tenant_id,
          ls.snapshot_id as latest_snapshot_id,
          ps.snapshot_id as prev_snapshot_id,
          ps.snapshot_date as prev_date,
          ls.snapshot_date as latest_date
        from latest_snapshot ls
        join previous_snapshot ps on ps.location_id = ls.location_id
      ),
      expected as (
        select
          uw.tenant_id,
          uw.location_id,
          uw.latest_snapshot_id,
          isl.inventory_item_id,
          isl.actual_remaining_oz as prev_remaining_oz,
          coalesce(sum(tud.ounces_used), 0) as usage_oz
        from usage_window uw
        join inventory_snapshot_lines isl on isl.snapshot_id = uw.prev_snapshot_id
        left join theoretical_usage_daily tud
          on tud.location_id = uw.location_id
          and tud.tenant_id = uw.tenant_id
          and tud.usage_date > uw.prev_date::date
          and tud.usage_date <= uw.latest_date::date
          and tud.ingredient_id = (
            select ingredient_id from inventory_items ii
            where ii.id = isl.inventory_item_id
          )
        group by
          uw.tenant_id,
          uw.location_id,
          uw.latest_snapshot_id,
          isl.inventory_item_id,
          isl.actual_remaining_oz
      ),
      actual as (
        select
          e.tenant_id,
          e.location_id,
          e.latest_snapshot_id,
          e.inventory_item_id,
          e.prev_remaining_oz,
          e.usage_oz,
          isl.actual_remaining_oz as actual_remaining_oz
        from expected e
        join inventory_snapshot_lines isl
          on isl.snapshot_id = e.latest_snapshot_id
          and isl.inventory_item_id = e.inventory_item_id
      ),
      variance_calc as (
        select
          a.tenant_id,
          a.location_id,
          a.latest_snapshot_id,
          a.inventory_item_id,
          (a.prev_remaining_oz - a.usage_oz) as expected_remaining_oz,
          a.actual_remaining_oz,
          (a.actual_remaining_oz - (a.prev_remaining_oz - a.usage_oz)) as variance_oz,
          case
            when (a.prev_remaining_oz - a.usage_oz) = 0 then 0
            else abs(a.actual_remaining_oz - (a.prev_remaining_oz - a.usage_oz)) / nullif((a.prev_remaining_oz - a.usage_oz), 0)
          end as variance_pct
        from actual a
      )
      insert into variance_flags (
        tenant_id,
        location_id,
        week_start_date,
        inventory_item_id,
        expected_remaining_oz,
        actual_remaining_oz,
        variance_oz,
        variance_pct,
        severity,
        created_at
      )
      select
        v.tenant_id,
        v.location_id,
        (select snapshot_date::date from inventory_snapshots s where s.id = v.latest_snapshot_id) as week_start_date,
        v.inventory_item_id,
        v.expected_remaining_oz,
        v.actual_remaining_oz,
        v.variance_oz,
        v.variance_pct,
        ${sql.unsafe(severityCase)} as severity,
        now() as created_at
      from variance_calc v
      on conflict do nothing;
    `;

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("api.jobs.variance done");

    return Response.json({ message: "Variance computed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("api.jobs.variance failed", message);
    return new Response(message, { status: 500 });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
