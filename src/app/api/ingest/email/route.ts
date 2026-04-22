import { supabaseAdmin } from "@/lib/supabase/admin";
import { SkyTabAdapter } from "@/lib/pos/adapters/skytab";
import { runImport } from "@/lib/pos/run-import";

// Postmark inbound webhook for SkyTab Lighthouse email exports
// Bar owners subscribe their SkyTab report to {locationId}@ingest.pourdex.com
// Postmark inbound processes the email and calls this endpoint
export async function POST(request: Request) {
  const webhookToken = request.headers.get("x-postmark-inbound-hash");
  if (
    !process.env.POSTMARK_INBOUND_HASH ||
    webhookToken !== process.env.POSTMARK_INBOUND_HASH
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) return new Response("Invalid JSON", { status: 400 });

  // Postmark delivers to e.g. "abc123@ingest.pourdex.com"
  // ToFull contains the recipient address
  const toAddress: string = payload.ToFull?.[0]?.Email ?? payload.To ?? "";
  const localPart = toAddress.split("@")[0] ?? "";

  if (!localPart) {
    return new Response("Cannot determine recipient", { status: 400 });
  }

  // Look up pos_connection by ingest_email (exact match first, then local-part prefix)
  let locationId: string | null = null;
  {
    const exact = await supabaseAdmin
      .from("pos_connections")
      .select("location_id")
      .eq("ingest_email", toAddress.toLowerCase())
      .eq("pos_type", "skytab")
      .maybeSingle();

    if (exact.data?.location_id) {
      locationId = exact.data.location_id as string;
    } else {
      const fallback = await supabaseAdmin
        .from("pos_connections")
        .select("location_id")
        .like("ingest_email", `${localPart}@%`)
        .eq("pos_type", "skytab")
        .maybeSingle();

      if (fallback.data?.location_id) {
        locationId = fallback.data.location_id as string;
      }
    }
  }

  if (!locationId) {
    return new Response("No SkyTab connection found for this email", { status: 404 });
  }

  // Get tenant_id from locations table
  const locationRow = await supabaseAdmin
    .from("locations")
    .select("tenant_id")
    .eq("id", locationId)
    .single();

  if (locationRow.error || !locationRow.data?.tenant_id) {
    return new Response("Location not found", { status: 404 });
  }

  const tenantId = locationRow.data.tenant_id as string;

  // Extract CSV from attachments (base64 encoded by Postmark)
  const attachments: Array<{ Name: string; Content: string; ContentType: string }> =
    payload.Attachments ?? [];

  const csvAttachment = attachments.find(
    (a) =>
      a.Name?.toLowerCase().endsWith(".csv") ||
      a.ContentType?.toLowerCase().includes("csv") ||
      a.ContentType?.toLowerCase().includes("text/plain"),
  );

  let reportCsv: string;
  if (csvAttachment?.Content) {
    reportCsv = Buffer.from(csvAttachment.Content, "base64").toString("utf-8");
  } else if (payload.TextBody && payload.TextBody.includes(",")) {
    // Some Lighthouse setups paste CSV inline in the email body
    reportCsv = payload.TextBody;
  } else {
    return new Response("No CSV attachment found in email", { status: 400 });
  }

  await supabaseAdmin
    .from("pos_connections")
    .update({
      last_file_received_at: new Date().toISOString(),
      files_received_total: supabaseAdmin.rpc("increment", { x: 1 }) as unknown as number,
    })
    .eq("location_id", locationId)
    .eq("pos_type", "skytab");

  const adapter = new SkyTabAdapter({ report: reportCsv });
  const baseUrl = new URL(request.url).origin;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const result = await runImport({
      tenantId,
      locationId,
      source: "skytab",
      adapter,
      rawCsvs: [{ type: "skytab_report", content: reportCsv }],
      triggerJobs: { baseUrl, from: yesterday, to: today },
    });

    await supabaseAdmin
      .from("pos_connections")
      .update({ last_import_at: new Date().toISOString(), status: "active", last_error: null })
      .eq("location_id", locationId)
      .eq("pos_type", "skytab");

    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await supabaseAdmin
      .from("pos_connections")
      .update({ last_error: message, status: "error" })
      .eq("location_id", locationId)
      .eq("pos_type", "skytab");

    console.error("email ingest failed", { locationId, message });
    return new Response(message, { status: 500 });
  }
}
