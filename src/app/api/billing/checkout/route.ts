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

  const paymentLink = process.env.QB_PAYMENT_LINK;
  if (!paymentLink) {
    return new Response("QB_PAYMENT_LINK is not set", { status: 500 });
  }

  // Append the user ID as a reference so QB can be linked back to this account
  const url = new URL(paymentLink);
  url.searchParams.set("ref", userData.user.id);

  return Response.json({ url: url.toString() });
}
