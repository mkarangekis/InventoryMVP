import { supabaseAdmin } from "@/lib/supabase/admin";
import { ToastAdapter } from "@/lib/pos/adapters/toast";
import { runImport } from "@/lib/pos/run-import";

const STORAGE_BUCKET = "pos-imports";

// Called by the SFTP watcher VPS service after a Toast nightly file upload.
// Body: { locationId, ordersPath, itemsPath }  ← preferred (Storage paths)
//       { locationId, orders, items }           ← legacy fallback (inline CSV)
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const secret = request.headers.get("x-toast-webhook-secret") ?? body.secret;
  if (!secret || secret !== process.env.TOAST_WEBHOOK_SECRET || !process.env.TOAST_WEBHOOK_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  const { locationId, orders, items, ordersPath, itemsPath } = body as {
    locationId?: string;
    orders?: string;
    items?: string;
    ordersPath?: string;
    itemsPath?: string;
  };

  if (!locationId) return new Response("Missing locationId", { status: 400 });

  // Resolve CSV content — either download from Storage or use inline strings
  let ordersCsv: string;
  let itemsCsv: string;
  const usingStorage = !!(ordersPath && itemsPath);

  if (usingStorage) {
    const [ordersResult, itemsResult] = await Promise.all([
      supabaseAdmin.storage.from(STORAGE_BUCKET).download(ordersPath),
      supabaseAdmin.storage.from(STORAGE_BUCKET).download(itemsPath),
    ]);

    if (ordersResult.error || !ordersResult.data) {
      console.error("toast-webhook: failed to download orders from storage", ordersResult.error?.message);
      return new Response(`Storage download failed: ${ordersResult.error?.message ?? "no data"}`, { status: 500 });
    }
    if (itemsResult.error || !itemsResult.data) {
      console.error("toast-webhook: failed to download items from storage", itemsResult.error?.message);
      return new Response(`Storage download failed: ${itemsResult.error?.message ?? "no data"}`, { status: 500 });
    }

    ordersCsv = await ordersResult.data.text();
    itemsCsv = await itemsResult.data.text();
  } else if (orders && items) {
    ordersCsv = orders;
    itemsCsv = items;
  } else {
    return new Response("Missing orders/items CSV or storage paths", { status: 400 });
  }

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

  await supabaseAdmin
    .from("pos_connections")
    .update({ last_file_received_at: new Date().toISOString() })
    .eq("location_id", locationId)
    .eq("pos_type", "toast");

  const adapter = new ToastAdapter({ orders: ordersCsv, items: itemsCsv });
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
        { type: "toast_orders", content: ordersCsv },
        { type: "toast_items", content: itemsCsv },
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

    // Clean up Storage objects now that import succeeded
    if (usingStorage) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([ordersPath, itemsPath]);
    }

    return Response.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    await supabaseAdmin
      .from("pos_connections")
      .update({ last_error: message, status: "error" })
      .eq("location_id", locationId)
      .eq("pos_type", "toast");

    // Leave Storage objects in place on failure — SFTP server retry will reuse the same paths
    console.error("toast-webhook import failed", { locationId, message });
    return new Response(message, { status: 500 });
  }
}
