/**
 * GET /api/billing/qb-callback
 *
 * OAuth 2.0 callback from Intuit after the admin completes the QB connect flow.
 * Exchanges the authorization code for access + refresh tokens, then displays
 * the refresh token so it can be stored as QB_REFRESH_TOKEN in the environment.
 *
 * This is a one-time admin setup route. Lock it down after initial use.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");

  // Basic CSRF check
  if (state !== (process.env.QB_CONNECT_SECRET ?? "qb-connect")) {
    return new Response("Invalid state", { status: 400 });
  }

  if (!code || !realmId) {
    return new Response("Missing code or realmId", { status: 400 });
  }

  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? "https://www.pourdex.com";

  if (!clientId || !clientSecret) {
    return new Response("QB_CLIENT_ID / QB_CLIENT_SECRET not set", { status: 500 });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const redirectUri = `${appUrl}/api/billing/qb-callback`;

  const res = await fetch(
    "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    },
  );

  if (!res.ok) {
    return new Response(`Token exchange failed: ${await res.text()}`, { status: 500 });
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  };

  // Return plaintext so the admin can copy values into environment variables.
  // Do NOT store these in logs or expose this endpoint publicly.
  return new Response(
    [
      "=== QuickBooks OAuth Setup Complete ===",
      "",
      "Add these to your environment variables now:",
      "",
      `QB_REALM_ID=${realmId}`,
      `QB_REFRESH_TOKEN=${tokens.refresh_token}`,
      "",
      `Access token expires in: ${tokens.expires_in}s`,
      `Refresh token expires in: ${Math.round(tokens.x_refresh_token_expires_in / 86400)} days`,
      "",
      "After saving these env vars, this route should be disabled or removed.",
    ].join("\n"),
    {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    },
  );
}
