import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";

const loadDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, "..", "..", "..", "..", "..");
  const envPath = path.join(rootDir, ".env.local");

  if (!fs.existsSync(envPath)) {
    return "";
  }

  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const [key, ...rest] = line.split("=");
    if (key.trim() === "DATABASE_URL") {
      return rest.join("=").trim();
    }
  }

  return "";
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
    return Response.json({ ok: true, snapshotId: "demo-snapshot-001" });
  }

  const body = await request.json();
  const locationId = String(body.locationId ?? "").trim();
  const snapshotDate = String(body.snapshotDate ?? "").trim();
  const lines = Array.isArray(body.lines) ? body.lines : [];

  if (!locationId || !snapshotDate || lines.length === 0) {
    return new Response("Missing required fields", { status: 400 });
  }

  const userId = userData.user.id;

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile.data) {
    return new Response("User profile not found", { status: 403 });
  }

  const tenantId = profile.data.tenant_id as string;

  const locationAccess = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (!locationAccess.data) {
    return new Response("No access to location", { status: 403 });
  }

  const snapshotInsert = await supabaseAdmin
    .from("inventory_snapshots")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      snapshot_date: snapshotDate,
      created_by: userId,
    })
    .select("id")
    .single();

  if (snapshotInsert.error) {
    return new Response(snapshotInsert.error.message, { status: 500 });
  }

  const snapshotId = snapshotInsert.data.id as string;

  const lineInserts = lines.map((line: { inventoryItemId: string; actualRemainingOz: number }) => ({
    tenant_id: tenantId,
    snapshot_id: snapshotId,
    inventory_item_id: line.inventoryItemId,
    actual_remaining_oz: line.actualRemainingOz,
  }));

  const lineResult = await supabaseAdmin
    .from("inventory_snapshot_lines")
    .insert(lineInserts);

  if (lineResult.error) {
    return new Response(lineResult.error.message, { status: 500 });
  }

  await supabaseAdmin.from("audit_logs").insert({
    tenant_id: tenantId,
    location_id: locationId,
    user_id: userId,
    action: "quick_count",
    entity_type: "inventory_snapshots",
    entity_id: snapshotId,
    details: { line_count: lineInserts.length },
  });

  const databaseUrl = loadDatabaseUrl();
  if (databaseUrl) {
    const sql = postgres(databaseUrl, { prepare: false });
    try {
      const adjustments = await sql`
        with prev_snapshot as (
          select id, snapshot_date
          from inventory_snapshots
          where tenant_id = ${tenantId}
            and location_id = ${locationId}
            and snapshot_date < ${snapshotDate}::date
          order by snapshot_date desc
          limit 1
        ),
        expected as (
          select
            isl.inventory_item_id,
            isl.actual_remaining_oz as prev_remaining_oz,
            coalesce(sum(tud.ounces_used), 0) as usage_oz
          from prev_snapshot ps
          join inventory_snapshot_lines isl on isl.snapshot_id = ps.id
          left join inventory_items ii on ii.id = isl.inventory_item_id
          left join theoretical_usage_daily tud
            on tud.tenant_id = ${tenantId}
            and tud.location_id = ${locationId}
            and tud.ingredient_id = ii.ingredient_id
            and tud.usage_date > ps.snapshot_date::date
            and tud.usage_date <= ${snapshotDate}::date
          group by isl.inventory_item_id, isl.actual_remaining_oz
        ),
        actual as (
          select
            inventory_item_id,
            actual_remaining_oz
          from inventory_snapshot_lines
          where snapshot_id = ${snapshotId}
        ),
        calc as (
          select
            a.inventory_item_id,
            (e.prev_remaining_oz - e.usage_oz) as expected_remaining_oz,
            a.actual_remaining_oz as actual_remaining_oz,
            (a.actual_remaining_oz - (e.prev_remaining_oz - e.usage_oz)) as delta_oz
          from actual a
          join expected e on e.inventory_item_id = a.inventory_item_id
        )
        insert into inventory_movements (
          tenant_id,
          location_id,
          movement_date,
          inventory_item_id,
          delta_oz,
          reason,
          ref_id
        )
        select
          ${tenantId},
          ${locationId},
          ${snapshotDate}::date,
          inventory_item_id,
          delta_oz,
          'adjustment',
          ${snapshotId}
        from calc
        where abs(delta_oz) > 0.01
        returning inventory_item_id, delta_oz
      `;

      await supabaseAdmin.from("audit_logs").insert({
        tenant_id: tenantId,
        location_id: locationId,
        user_id: userId,
        action: "inventory_recalibration",
        entity_type: "inventory_snapshots",
        entity_id: snapshotId,
        details: {
          adjustment_count: adjustments.length,
        },
      });
    } finally {
      await sql.end({ timeout: 5 });
    }
  }

  console.info("inventory snapshot recorded", { snapshotId, locationId });

  return Response.json({ ok: true, snapshotId });
}
