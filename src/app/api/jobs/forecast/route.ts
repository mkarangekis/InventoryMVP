import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";

type RequestBody = {
  date?: string;
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
  const runDate = body.date ?? new Date().toISOString().slice(0, 10);
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

  console.info("api.jobs.forecast start", { tenantId, locationId, runDate });

  try {
    const [jobRun] = await sql`
      insert into job_runs (tenant_id, location_id, job_name, status)
      values (${tenantId}, ${locationId}, 'compute-forecast', 'running')
      returning id
    `;

    await sql`
      delete from demand_forecasts_daily
      where forecast_date between ${runDate}::date and (${runDate}::date + interval '13 days')
        and tenant_id = ${tenantId}
        and (${locationId}::uuid is null or location_id = ${locationId});
    `;

    await sql`
      with history as (
        select
          ii.id as inventory_item_id,
          tud.location_id,
          tud.tenant_id,
          tud.usage_date,
          sum(tud.ounces_used) as ounces_used
        from theoretical_usage_daily tud
        join inventory_items ii
          on ii.ingredient_id = tud.ingredient_id
          and ii.location_id = tud.location_id
          and ii.tenant_id = tud.tenant_id
        where tud.usage_date >= ${runDate}::date - interval '56 days'
          and tud.usage_date < ${runDate}::date
          and tud.tenant_id = ${tenantId}
          and (${locationId}::uuid is null or tud.location_id = ${locationId})
        group by ii.id, tud.location_id, tud.tenant_id, tud.usage_date
      ),
      weekday_stats as (
        select
          inventory_item_id,
          location_id,
          tenant_id,
          extract(dow from usage_date) as dow,
          avg(ounces_used) as avg_oz,
          count(*) as day_count
        from history
        group by inventory_item_id, location_id, tenant_id, extract(dow from usage_date)
      ),
      overall_stats as (
        select
          inventory_item_id,
          location_id,
          tenant_id,
          avg(ounces_used) as avg_oz
        from history
        group by inventory_item_id, location_id, tenant_id
      ),
      forecast_dates as (
        select (${runDate}::date + gs.day)::date as forecast_date
        from generate_series(0, 13) as gs(day)
      ),
      expanded as (
        select
          os.tenant_id,
          os.location_id,
          os.inventory_item_id,
          fd.forecast_date,
          ws.avg_oz as weekday_avg,
          ws.day_count,
          os.avg_oz as overall_avg,
          extract(dow from fd.forecast_date) as dow
        from overall_stats os
        cross join forecast_dates fd
        left join weekday_stats ws
          on ws.inventory_item_id = os.inventory_item_id
          and ws.location_id = os.location_id
          and ws.tenant_id = os.tenant_id
          and ws.dow = extract(dow from fd.forecast_date)
      )
      insert into demand_forecasts_daily (
        tenant_id,
        location_id,
        forecast_date,
        inventory_item_id,
        forecast_usage_oz,
        method,
        computed_at
      )
      select
        tenant_id,
        location_id,
        forecast_date,
        inventory_item_id,
        case when coalesce(day_count, 0) >= 3 then weekday_avg else overall_avg end as forecast_usage_oz,
        'dow_baseline' as method,
        now() as computed_at
      from expanded;
    `;

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("api.jobs.forecast done");

    return Response.json({ message: "Forecast computed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("api.jobs.forecast failed", message);
    return new Response(message, { status: 500 });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
