import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false });

const run = async () => {
  const now = new Date();
  const start = new Date(now.getTime() - 7 * 86400000);

  const items = await sql`
    select distinct ii.id, ii.tenant_id, ii.location_id
    from inventory_items ii
  `;

  const rows = [];
  for (const item of items) {
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(start.getTime() + i * 86400000);
      rows.push({
        tenant_id: item.tenant_id,
        location_id: item.location_id,
        forecast_date: d.toISOString().slice(0, 10),
        inventory_item_id: item.id,
        forecast_usage_oz: 4 + i * 0.2,
        method: "seed",
        computed_at: new Date().toISOString(),
      });
    }
  }

  if (rows.length > 0) {
    await sql`insert into demand_forecasts_daily ${sql(rows)}`;
  }

  console.log("Seeded demand forecasts", rows.length);
  await sql.end({ timeout: 5 });
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});