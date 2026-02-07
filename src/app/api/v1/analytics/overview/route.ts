import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoForecast, demoVarianceFlags, isDemoEmail } from "@/lib/demo";

export const dynamic = "force-dynamic";

type OverviewAnalytics = {
  forecastByDay: { date: string; total_usage_oz: number }[];
  varianceByWeek: {
    week_start_date: string;
    total_abs_variance_oz: number;
    flag_count: number;
  }[];
  topForecastItems: {
    inventory_item_id: string;
    item_name: string;
    total_usage_oz: number;
  }[];
  stockoutRisk: {
    inventory_item_id: string;
    item_name: string;
    forecast_next_14d_oz: number;
  }[];
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");

  if (isDemoEmail(userData.user.email)) {
    const forecast = demoForecast;
    const flags = demoVarianceFlags;

    const forecastByDayMap = new Map<string, number>();
    for (const row of forecast) {
      const prev = forecastByDayMap.get(row.forecast_date) ?? 0;
      forecastByDayMap.set(row.forecast_date, prev + (row.forecast_usage_oz ?? 0));
    }

    const varianceByWeekMap = new Map<string, { total: number; count: number }>();
    for (const row of flags) {
      const key = row.week_start_date;
      const prev = varianceByWeekMap.get(key) ?? { total: 0, count: 0 };
      const v = Number.parseFloat(String(row.variance_oz ?? "0"));
      varianceByWeekMap.set(key, {
        total: prev.total + (Number.isNaN(v) ? 0 : Math.abs(v)),
        count: prev.count + 1,
      });
    }

    const response: OverviewAnalytics = {
      forecastByDay: Array.from(forecastByDayMap.entries())
        .map(([date, total_usage_oz]) => ({ date, total_usage_oz }))
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        ),
      varianceByWeek: Array.from(varianceByWeekMap.entries())
        .map(([week_start_date, v]) => ({
          week_start_date,
          total_abs_variance_oz: v.total,
          flag_count: v.count,
        }))
        .sort(
          (a, b) =>
            new Date(a.week_start_date).getTime() -
            new Date(b.week_start_date).getTime(),
        ),
      topForecastItems: [],
      stockoutRisk: [],
    };
    return Response.json(response);
  }

  const userId = userData.user.id;
  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    const empty: OverviewAnalytics = {
      forecastByDay: [],
      varianceByWeek: [],
      topForecastItems: [],
      stockoutRisk: [],
    };
    return Response.json(empty);
  }

  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  const [forecastRes, flagsRes] = await Promise.all([
    supabaseAdmin
      .from("demand_forecasts_daily")
      .select("forecast_date,inventory_item_id,forecast_usage_oz,location_id")
      .in("location_id", scopedLocationIds)
      .order("forecast_date", { ascending: true })
      .limit(200),
    supabaseAdmin
      .from("variance_flags")
      .select("week_start_date,inventory_item_id,variance_oz,location_id")
      .in("location_id", scopedLocationIds)
      .order("week_start_date", { ascending: false })
      .limit(200),
  ]);

  if (forecastRes.error) {
    return new Response(forecastRes.error.message, { status: 500 });
  }
  if (flagsRes.error) {
    return new Response(flagsRes.error.message, { status: 500 });
  }

  const forecastRows = forecastRes.data ?? [];
  const flagRows = flagsRes.data ?? [];

  const forecastByDayMap = new Map<string, number>();
  const forecastByItemMap = new Map<string, number>();
  for (const row of forecastRows) {
    const d = row.forecast_date as string;
    const prevDay = forecastByDayMap.get(d) ?? 0;
    const value = Number(row.forecast_usage_oz ?? 0);
    forecastByDayMap.set(d, prevDay + (Number.isFinite(value) ? value : 0));

    const itemId = row.inventory_item_id as string;
    const prevItem = forecastByItemMap.get(itemId) ?? 0;
    forecastByItemMap.set(itemId, prevItem + (Number.isFinite(value) ? value : 0));
  }

  const varianceByWeekMap = new Map<string, { total: number; count: number }>();
  for (const row of flagRows) {
    const key = row.week_start_date as string;
    const prev = varianceByWeekMap.get(key) ?? { total: 0, count: 0 };
    const v = Number.parseFloat(String(row.variance_oz ?? "0"));
    varianceByWeekMap.set(key, {
      total: prev.total + (Number.isNaN(v) ? 0 : Math.abs(v)),
      count: prev.count + 1,
    });
  }

  const itemIds = Array.from(forecastByItemMap.keys());
  let itemNameMap = new Map<string, string>();
  if (itemIds.length) {
    const items = await supabaseAdmin
      .from("inventory_items")
      .select("id,name_override,ingredient_id")
      .in("id", itemIds);

    const ingredientIds = Array.from(
      new Set((items.data ?? []).map((row) => row.ingredient_id)),
    );

    const ingredients = ingredientIds.length
      ? await supabaseAdmin
          .from("ingredients")
          .select("id,name")
          .in("id", ingredientIds)
      : { data: [] };

    const ingredientMap = new Map(
      (ingredients.data ?? []).map((row) => [row.id, row.name]),
    );

    itemNameMap = new Map(
      (items.data ?? []).map((row) => [
        row.id,
        row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
      ]),
    );
  }

  const topForecastItems = Array.from(forecastByItemMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([inventory_item_id, total_usage_oz]) => ({
      inventory_item_id,
      item_name: itemNameMap.get(inventory_item_id) ?? "Unknown",
      total_usage_oz,
    }));

  const response: OverviewAnalytics = {
    forecastByDay: Array.from(forecastByDayMap.entries())
      .map(([date, total_usage_oz]) => ({ date, total_usage_oz }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    varianceByWeek: Array.from(varianceByWeekMap.entries())
      .map(([week_start_date, v]) => ({
        week_start_date,
        total_abs_variance_oz: v.total,
        flag_count: v.count,
      }))
      .sort(
        (a, b) =>
          new Date(a.week_start_date).getTime() -
          new Date(b.week_start_date).getTime(),
      ),
    topForecastItems,
    stockoutRisk: [],
  };

  return Response.json(response);
}

