import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

type RequestBody = {
  from?: string;
  to?: string;
  locationId?: string;
};

const getDefaultFromDate = () =>
  new Date(Date.now() - 86400000).toISOString().slice(0, 10);

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
    return Response.json({ ok: true, message: "Demo: usage job queued." });
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
  const from = body.from ?? getDefaultFromDate();
  const to = body.to ?? from;
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

  console.info("api.jobs.usage start", { tenantId, locationId, from, to });

  try {
    const [jobRun] = await sql`
      insert into job_runs (tenant_id, location_id, job_name, status)
      values (${tenantId}, ${locationId}, 'compute-theoretical-usage', 'running')
      returning id
    `;

    await sql`
      insert into theoretical_usage_daily (
        tenant_id,
        location_id,
        usage_date,
        ingredient_id,
        ounces_used,
        computed_at
      )
      select
        oi.tenant_id,
        oi.location_id,
        o.closed_at::date as usage_date,
        dsl.ingredient_id,
        sum(oi.quantity * dsl.ounces) as ounces_used,
        now() as computed_at
      from pos_order_items oi
      join pos_orders o
        on o.pos_order_id = oi.pos_order_id
        and o.location_id = oi.location_id
        and o.tenant_id = oi.tenant_id
      join drink_specs ds
        on ds.menu_item_id = oi.menu_item_id
        and ds.location_id = oi.location_id
        and ds.tenant_id = oi.tenant_id
        and ds.active = 1
      join drink_spec_lines dsl
        on dsl.drink_spec_id = ds.id
      where o.closed_at::date between ${from}::date and ${to}::date
        and o.tenant_id = ${tenantId}
        and (${locationId}::uuid is null or o.location_id = ${locationId})
      group by
        oi.tenant_id,
        oi.location_id,
        o.closed_at::date,
        dsl.ingredient_id
      on conflict (tenant_id, location_id, usage_date, ingredient_id)
      do update set
        ounces_used = excluded.ounces_used,
        computed_at = excluded.computed_at;
    `;

    await sql`
      update job_runs
      set status = 'completed', finished_at = now()
      where id = ${jobRun.id}
    `;

    console.info("api.jobs.usage done");

    return Response.json({ message: "Theoretical usage computed." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("api.jobs.usage failed", message);
    return new Response(message, { status: 500 });
  } finally {
    await sql.end({ timeout: 5 });
  }
}
