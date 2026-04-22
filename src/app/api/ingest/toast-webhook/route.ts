import { supabaseAdmin } from "@/lib/supabase/admin";
import { ToastAdapter } from "@/lib/pos/adapters/toast";
import { runImport } from "@/lib/pos/run-import";

// Called by the SFTP watcher VPS service after a Toast nightly file upload
// Body: { secret, locationId, orders: "<csv>", items: "<csv>" }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const secret = request.headers.get("x-toast-webhook-secret") ?? body.secret;
  if (!secret || secret !== process.env.TOAST_WEBHOOK_SECRET || !process.env.TOAST_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const { locationId, orders, items } = body as {
    locationId?: string;
    orders?: string;
    items?: string;
  };

  if (!locationId) return new Response("Missing locationId", { status: 400 });
  if (!orders || !items) return new Response("Missing orders or items CSV", { status: 400 });

  // Look up tenant for this location
  const locationRow = await supabaseAdmin
    .from("locations")
    .select("tenant_id")
    .eq("id", locationId)
    .single();

  if (locationRow.error || !locationRow.data?.tenant_id) {
    return new Response("Location not found", { status: 404 });
  }

  const tenantId = locationRow.data.tenant_id as string;

  // Update pos_connections last_file_received_at
  await supabaseAdmin
    .from("pos_connections")
    .update({ last_file_received_at: new Date().toISOString() })
    .eq("location_id", locationId)
    .eq("pos_type", "toast");

  const adapter = new ToastAdapter({ orders, items });
  const baseUrl = new URL(request.url).origin;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const result = await runImport({
      tenantId,
      locationId,
      source: "toast",
      adapter,
      rawCsvs: [
        { type: "toast_orders", content: orders },
        { type: "toast_items", content: items },
      ],
      triggerJobs: { baseUrl, from: yesterday, to: today },
    });

    await supabaseAdmin
      .from("pos_connections")
      .update({
        last_import_at: new Date().toISOString(),
        status: "active",
        last_error: null,
      })
      .eq("location_id", locationId)
      .eq("pos_type", "toast");

    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await supabaseAdmin
      .from("pos_connections")
      .update({ last_error: message, status: "error" })
      .eq("location_id", locationId)
      .eq("pos_type", "toast");

    console.error("toast-webhook import failed", { locationId, message });
    return new Response(message, { status: 500 });
  }
}
