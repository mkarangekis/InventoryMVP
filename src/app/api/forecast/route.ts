import { supabaseAdmin } from "@/lib/supabase/admin";
import { demoForecast, isDemoEmail } from "@/lib/demo";

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

  if (isDemoEmail(userData.user.email)) {
    return Response.json({ forecast: demoForecast });
  }

  const userId = userData.user.id;

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return Response.json({ forecast: [] });
  }

  const url = new URL(request.url);
  const requestedLocation = url.searchParams.get("locationId");
  const scopedLocationIds =
    requestedLocation && locationIds.includes(requestedLocation)
      ? [requestedLocation]
      : locationIds;

  const forecast = await supabaseAdmin
    .from("demand_forecasts_daily")
    .select("forecast_date,inventory_item_id,forecast_usage_oz,location_id")
    .in("location_id", scopedLocationIds)
    .order("forecast_date", { ascending: true })
    .limit(50);

  if (forecast.error) {
    return new Response(forecast.error.message, { status: 500 });
  }

  return Response.json({ forecast: forecast.data ?? [] });
}
