import { supabaseAdmin } from "@/lib/supabase/admin";

const DEFAULT_LIMIT = 200;

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const runId = params?.id || pathParts[pathParts.length - 1];
  if (!runId) {
    return new Response("Missing import run id", { status: 400 });
  }

  const locations = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId);

  const locationIds = (locations.data ?? []).map((row) => row.location_id);
  if (locationIds.length === 0) {
    return new Response("No locations available", { status: 403 });
  }

  const run = await supabaseAdmin
    .from("pos_import_runs")
    .select(
      "id,tenant_id,location_id,source,status,started_at,finished_at,error_summary",
    )
    .eq("id", runId)
    .eq("tenant_id", profile.data.tenant_id)
    .in("location_id", locationIds)
    .maybeSingle();

  if (run.error) {
    return new Response(run.error.message, { status: 500 });
  }
  if (!run.data) {
    return new Response("Import run not found", { status: 404 });
  }

  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(
    Math.max(Number(limitParam) || DEFAULT_LIMIT, 1),
    1000,
  );

  const rows = await supabaseAdmin
    .from("pos_import_rows")
    .select("row_type,row_number,row_data")
    .eq("import_run_id", runId)
    .order("row_number", { ascending: true })
    .limit(limit);

  if (rows.error) {
    return new Response(rows.error.message, { status: 500 });
  }

  return Response.json({
    run: run.data,
    rows: rows.data ?? [],
    limit,
  });
}
