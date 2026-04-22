import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (errorParam) {
    return Response.redirect(`${appUrl}/integrations?error=square_denied`, 302);
  }

  if (!code || !stateParam) {
    return Response.redirect(`${appUrl}/integrations?error=square_invalid`, 302);
  }

  let locationId: string;
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    locationId = decoded.locationId;
    userId = decoded.userId;
    if (!locationId || !userId) throw new Error("bad state");
  } catch {
    return Response.redirect(`${appUrl}/integrations?error=square_state`, 302);
  }

  const appId = process.env.SQUARE_APP_ID;
  const appSecret = process.env.SQUARE_APP_SECRET;
  if (!appId || !appSecret) {
    return Response.redirect(`${appUrl}/integrations?error=square_config`, 302);
  }

  const env = process.env.SQUARE_ENVIRONMENT === "production" ? "" : "sandbox.";

  const tokenRes = await fetch(`https://connect.${env}squareup.com/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": "2024-01-18" },
    body: JSON.stringify({
      client_id: appId,
      client_secret: appSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: `${appUrl}/api/integrations/square/callback`,
    }),
  });

  if (!tokenRes.ok) {
    console.error("Square token exchange failed", await tokenRes.text());
    return Response.redirect(`${appUrl}/integrations?error=square_token`, 302);
  }

  const tokenData = await tokenRes.json();
  const {
    access_token,
    refresh_token,
    expires_at,
    merchant_id,
  } = tokenData;

  // Fetch the Square location list to find the right Square location ID
  const locRes = await fetch(`https://connect.${env}squareup.com/v2/locations`, {
    headers: { Authorization: `Bearer ${access_token}`, "Square-Version": "2024-01-18" },
  });

  let squareLocationId = "";
  if (locRes.ok) {
    const locData = await locRes.json();
    // Default to first location; can be updated in UI
    squareLocationId = locData.locations?.[0]?.id ?? "";
  }

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .single();

  if (profile.error || !profile.data?.tenant_id) {
    return Response.redirect(`${appUrl}/integrations?error=square_profile`, 302);
  }

  const tenantId = profile.data.tenant_id as string;

  await supabaseAdmin.from("pos_connections").upsert(
    {
      tenant_id: tenantId,
      location_id: locationId,
      pos_type: "square",
      status: "active",
      square_merchant_id: merchant_id,
      square_access_token: access_token,
      square_refresh_token: refresh_token,
      square_location_id: squareLocationId,
      square_token_expires_at: expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "location_id,pos_type" },
  );

  return Response.redirect(`${appUrl}/integrations?connected=square`, 302);
}
