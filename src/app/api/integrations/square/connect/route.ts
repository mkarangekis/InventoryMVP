import { supabaseAdmin } from "@/lib/supabase/admin";

// Initiates Square OAuth flow
// GET /api/integrations/square/connect?locationId=<uuid>
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return new Response("Missing auth token", { status: 401 });

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) return new Response("Invalid auth token", { status: 401 });

  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId");
  if (!locationId) return new Response("Missing locationId", { status: 400 });

  const appId = process.env.SQUARE_APP_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appId || !appUrl) return new Response("Square not configured", { status: 500 });

  const state = Buffer.from(
    JSON.stringify({ locationId, userId: userData.user.id }),
  ).toString("base64url");

  const env = process.env.SQUARE_ENVIRONMENT === "production" ? "" : "sandbox.";
  const authUrl =
    `https://${env}squareup.com/oauth2/authorize` +
    `?client_id=${appId}` +
    `&scope=ORDERS_READ+ITEMS_READ` +
    `&session=false` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(`${appUrl}/api/integrations/square/callback`)}`;

  return Response.redirect(authUrl, 302);
}
