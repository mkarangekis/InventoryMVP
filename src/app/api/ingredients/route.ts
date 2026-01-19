import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const userId = userData.user.id;

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile.data) {
    return new Response("User profile not found", { status: 403 });
  }

  const ingredients = await supabaseAdmin
    .from("ingredients")
    .select("id,name,type")
    .eq("tenant_id", profile.data.tenant_id)
    .order("name", { ascending: true });

  if (ingredients.error) {
    return new Response(ingredients.error.message, { status: 500 });
  }

  return Response.json({ items: ingredients.data ?? [] });
}