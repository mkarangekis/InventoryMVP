import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { supabaseAdmin } from "@/lib/supabase/admin";

const loadDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(__dirname, "..", "..", "..", "..");
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

export async function GET(request: Request) {
  try {
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

    const locations = await supabaseAdmin
      .from("user_locations")
      .select("location_id")
      .eq("user_id", userId);

    const locationIds = (locations.data ?? []).map((row) => row.location_id);
    if (locationIds.length === 0) {
      return Response.json({ items: [] });
    }

    const databaseUrl = loadDatabaseUrl();
    if (!databaseUrl) {
      return new Response("DATABASE_URL not configured", { status: 500 });
    }

    const url = new URL(request.url);
    const requestedLocation = url.searchParams.get("locationId");
    const scopedLocationIds =
      requestedLocation && locationIds.includes(requestedLocation)
        ? [requestedLocation]
        : locationIds;
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    let fromDate = fromParam ?? "";
    let toDate = toParam ?? "";

    const sql = postgres(databaseUrl, { prepare: false });

    if (!fromDate || !toDate) {
      const [range] = await sql`
        select
          min(o.closed_at) as min_date,
          max(o.closed_at) as max_date
        from pos_orders o
        where o.location_id = any(${scopedLocationIds});
      `;

      if (!fromDate) {
        fromDate =
          range?.min_date ??
          new Date(Date.now() - 30 * 86400000).toISOString();
      }
      if (!toDate) {
        toDate = range?.max_date ?? new Date().toISOString();
      }
    }

    const sales = await sql`
      select
        oi.menu_item_id,
        sum(oi.quantity) as qty_sold,
        sum(oi.gross) as revenue
      from pos_order_items oi
      join pos_orders o
        on o.pos_order_id = oi.pos_order_id
        and o.location_id = oi.location_id
        and o.tenant_id = oi.tenant_id
      where o.closed_at between ${fromDate}::timestamptz and ${toDate}::timestamptz
        and o.location_id = any(${scopedLocationIds})
      group by oi.menu_item_id;
    `;

    const costs = await sql`
      select
        ds.menu_item_id,
        ds.target_pour_oz,
        ds.glass_type,
        sum(dsl.ounces * ic.cost_per_oz) as cost_per_serv
      from drink_specs ds
      join drink_spec_lines dsl on dsl.drink_spec_id = ds.id
      join ingredient_costs ic
        on ic.ingredient_id = dsl.ingredient_id
        and ic.tenant_id = ds.tenant_id
        and ic.effective_to is null
      where ds.active = 1
        and ds.location_id = any(${scopedLocationIds})
      group by ds.menu_item_id, ds.target_pour_oz, ds.glass_type;
    `;

    const menuItems = await sql`
      select id, name, base_price
      from menu_items
      where location_id = any(${scopedLocationIds});
    `;

    const specLines = await sql`
      select
        ds.menu_item_id,
        dsl.ingredient_id,
        dsl.ounces,
        i.type,
        i.name
      from drink_specs ds
      join drink_spec_lines dsl on dsl.drink_spec_id = ds.id
      join ingredients i on i.id = dsl.ingredient_id
      where ds.active = 1
        and ds.location_id = any(${scopedLocationIds});
    `;

    const varianceIngredients = await sql`
      select distinct ii.ingredient_id
      from variance_flags vf
      join inventory_items ii on ii.id = vf.inventory_item_id
      where vf.severity = 'high'
        and vf.location_id = any(${scopedLocationIds})
        and vf.week_start_date >= (now() - interval '30 days');
    `;

    const ingredientVarianceSet = new Set(
      varianceIngredients.map((row) => row.ingredient_id),
    );

    const menuItemMap = new Map(menuItems.map((row) => [row.id, row]));
    const costMap = new Map(costs.map((row) => [row.menu_item_id, row]));
    const specLineMap = new Map<
      string,
      { ingredient_id: string; ounces: number; type: string; name: string }[]
    >();

    for (const row of specLines) {
      const list = specLineMap.get(row.menu_item_id) ?? [];
      list.push({
        ingredient_id: row.ingredient_id,
        ounces: Number(row.ounces ?? 0),
        type: row.type ?? "other",
        name: row.name ?? "Unknown",
      });
      specLineMap.set(row.menu_item_id, list);
    }

    const glassCapacityOz: Record<string, number> = {
      rocks: 10,
      coupe: 6,
      martini: 6,
      highball: 12,
      collins: 12,
      pint: 16,
      wine: 12,
      nickandnora: 5,
    };

    const items = sales.map((row) => {
      const menu = menuItemMap.get(row.menu_item_id);
      const cost = costMap.get(row.menu_item_id);
      const qtySold = Number(row.qty_sold ?? 0);
      const revenue = Number(row.revenue ?? 0);
      const priceEach = qtySold > 0 ? revenue / qtySold : 0;
      const costPerServ = Number(cost?.cost_per_serv ?? 0);
      const profitPerServ = priceEach - costPerServ;
      const marginPct = priceEach > 0 ? profitPerServ / priceEach : 0;

      const recommendations: string[] = [];

      const specLinesForItem = specLineMap.get(row.menu_item_id) ?? [];
      const hasVarianceIngredient = specLinesForItem.some((line) =>
        ingredientVarianceSet.has(line.ingredient_id),
      );

      const primarySpirit =
        specLinesForItem
          .filter((line) => line.type === "spirit")
          .sort((a, b) => b.ounces - a.ounces)[0] ??
        specLinesForItem.sort((a, b) => b.ounces - a.ounces)[0];

      if (marginPct < 0.7 && qtySold >= 10) {
        recommendations.push("Raise price $1-$2 test");
      }
      if (marginPct < 0.7 && hasVarianceIngredient) {
        recommendations.push(
          primarySpirit?.name
            ? `Tighten spec by 0.25 oz (${primarySpirit.name})`
            : "Tighten spec by 0.25 oz",
        );
      }
      if (cost?.target_pour_oz && cost?.glass_type) {
        const glassKey = String(cost.glass_type).toLowerCase();
        const capacity = glassCapacityOz[glassKey];
        if (capacity && Number(cost.target_pour_oz) >= 0.9 * capacity) {
          recommendations.push("Consider smaller glass");
        }
      }
      if (recommendations.length === 0) {
        recommendations.push(
          qtySold >= 10 ? "Promote top performer" : "Monitor performance",
        );
      }

      return {
        menu_item_id: row.menu_item_id,
        name: menu?.name ?? "Unknown",
        qty_sold: qtySold,
        revenue,
        price_each: Number(priceEach.toFixed(2)),
        cost_per_serv: Number(costPerServ.toFixed(2)),
        profit_per_serv: Number(profitPerServ.toFixed(2)),
        margin_pct: Number((marginPct * 100).toFixed(1)),
        recommendations,
      };
    });

    await sql.end({ timeout: 5 });

    items.sort((a, b) => b.profit_per_serv - a.profit_per_serv);

    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("profit ranking failed", message);
    return new Response(message, { status: 500 });
  }
}
