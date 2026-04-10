/**
 * GET /api/billing/qb-connect
 *
 * ONE-TIME SETUP ROUTE — used by a Pourdex admin to connect the app to its
 * QuickBooks Online account and obtain the initial OAuth refresh token.
 *
 * After obtaining the refresh token, store it as QB_REFRESH_TOKEN in your
 * environment and remove or lock down this route.
 *
 * Protect this route with QB_CONNECT_SECRET so only admins can trigger it.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!secret || secret !== process.env.QB_CONNECT_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const clientId = process.env.QB_CLIENT_ID;
  const appUrl = process.env.APP_URL ?? "https://www.pourdex.com";

  if (!clientId) {
    return new Response("QB_CLIENT_ID is not set", { status: 500 });
  }

  const redirectUri = `${appUrl}/api/billing/qb-callback`;
  const state = process.env.QB_CONNECT_SECRET ?? "qb-connect";

  const authUrl = new URL(
    "https://appcenter.intuit.com/connect/oauth2",
  );
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    "com.intuit.quickbooks.accounting com.intuit.quickbooks.payment",
  );
  authUrl.searchParams.set("state", state);

  return Response.redirect(authUrl.toString(), 302);
}
