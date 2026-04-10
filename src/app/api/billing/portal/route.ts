import { supabaseAdmin } from "@/lib/supabase/admin";

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

  const portalUrl = process.env.QB_CUSTOMER_PORTAL_URL;
  if (!portalUrl) {
    return new Response("QB_CUSTOMER_PORTAL_URL is not set", { status: 500 });
  }

  return Response.json({ url: portalUrl });
}
