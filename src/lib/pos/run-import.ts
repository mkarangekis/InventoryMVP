import { supabaseAdmin } from "@/lib/supabase/admin";
import { parseCsv } from "./csv";
import type { PosAdapter } from "./adapters/adapter";

export type ImportSource = "csv" | "toast" | "skytab" | "square";

export type RunImportOptions = {
  tenantId: string;
  locationId: string;
  source: ImportSource;
  adapter: PosAdapter;
  rawCsvs?: { type: string; content: string }[];
  triggerJobs?: {
    baseUrl: string;
    from: string;
    to: string;
  };
};

export type ImportResult = {
  importRunId: string;
  orders: number;
  items: number;
  modifiers: number;
  voids: number;
};

export async function runImport(opts: RunImportOptions): Promise<ImportResult> {
  const { tenantId, locationId, source, adapter, rawCsvs, triggerJobs } = opts;

  const importRun = await supabaseAdmin
    .from("pos_import_runs")
    .insert({ tenant_id: tenantId, location_id: locationId, source, status: "processing" })
    .select("id")
    .single();

  if (importRun.error) throw new Error(importRun.error.message);
  const importRunId = importRun.data.id as string;

  try {
    const [menuItems, orders, orderItems, modifiers, voidsComps] = await Promise.all([
      adapter.listMenuItems(),
      adapter.importOrders({ from: "", to: "" }),
      adapter.importOrderItems({ from: "", to: "" }),
      adapter.importModifiers({ from: "", to: "" }),
      adapter.importVoidsComps({ from: "", to: "" }),
    ]);

    // Menu items — upsert, skip duplicates (idempotent replay safe)
    if (menuItems.length > 0) {
      const { data: inserted } = await supabaseAdmin
        .from("menu_items")
        .upsert(
          menuItems.map((i) => ({ tenant_id: tenantId, location_id: locationId, pos_menu_item_id: i.posMenuItemId, name: i.name, is_active: 1 })),
          { onConflict: "tenant_id,location_id,pos_menu_item_id", ignoreDuplicates: true },
        )
        .select("id,pos_menu_item_id");

      // Also load any that already existed so we can map menu_item_id on order items
      const { data: existing } = await supabaseAdmin
        .from("menu_items")
        .select("id,pos_menu_item_id")
        .eq("location_id", locationId)
        .in("pos_menu_item_id", menuItems.map((i) => i.posMenuItemId));

      var menuMap = new Map<string, string>();
      for (const item of [...(existing ?? []), ...(inserted ?? [])]) {
        if (item.pos_menu_item_id) menuMap.set(item.pos_menu_item_id, item.id);
      }
    } else {
      var menuMap = new Map<string, string>();
    }

    // Orders — ON CONFLICT (tenant_id, location_id, pos_order_id) DO NOTHING
    if (orders.length > 0) {
      await supabaseAdmin
        .from("pos_orders")
        .upsert(
          orders.map((o) => ({
            tenant_id: tenantId,
            location_id: locationId,
            pos_order_id: o.posOrderId,
            opened_at: o.openedAt,
            closed_at: o.closedAt,
            subtotal: o.subtotal,
            tax: o.tax,
            total: o.total,
            status: o.status,
          })),
          { onConflict: "tenant_id,location_id,pos_order_id", ignoreDuplicates: true },
        );
    }

    // Order items — ON CONFLICT (tenant_id, location_id, pos_item_id) DO NOTHING
    if (orderItems.length > 0) {
      await supabaseAdmin
        .from("pos_order_items")
        .upsert(
          orderItems.map((i) => ({
            tenant_id: tenantId,
            location_id: locationId,
            pos_item_id: i.posItemId,
            pos_order_id: i.posOrderId,
            menu_item_id: menuMap.get(i.posMenuItemId) ?? null,
            name: i.itemName,
            quantity: i.quantity,
            price_each: i.priceEach,
            gross: i.quantity * i.priceEach,
          })),
          { onConflict: "tenant_id,location_id,pos_item_id", ignoreDuplicates: true },
        );
    }

    // Modifiers — no natural unique key, skip duplicates by catching errors
    if (modifiers.length > 0) {
      await supabaseAdmin.from("pos_modifiers").insert(
        modifiers.map((m) => ({ tenant_id: tenantId, location_id: locationId, pos_item_id: m.posItemId, name: m.name, price_delta: m.priceDelta })),
      );
    }

    // Voids/comps — same, no natural unique key
    if (voidsComps.length > 0) {
      await supabaseAdmin.from("pos_voids_comps").insert(
        voidsComps.map((v) => ({ tenant_id: tenantId, location_id: locationId, pos_item_id: v.posItemId, type: v.type, reason: v.reason, amount: v.amount })),
      );
    }

    // Raw CSV rows for audit trail
    if (rawCsvs && rawCsvs.length > 0) {
      const rawRows: object[] = [];
      for (const { type, content } of rawCsvs) {
        const { rows } = parseCsv(content, []);
        rows.forEach((row, index) => {
          rawRows.push({ tenant_id: tenantId, location_id: locationId, import_run_id: importRunId, row_type: type, row_number: index + 1, row_data: row });
        });
      }
      if (rawRows.length > 0) await supabaseAdmin.from("pos_import_rows").insert(rawRows);
    }

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      location_id: locationId,
      user_id: null,
      action: "ingest.completed",
      entity_type: "pos_import_runs",
      entity_id: importRunId,
      details: { source, orders: orders.length, items: orderItems.length, modifiers: modifiers.length, voids: voidsComps.length },
    });

    await supabaseAdmin
      .from("pos_import_runs")
      .update({ status: "completed", finished_at: new Date().toISOString() })
      .eq("id", importRunId);

    // Trigger downstream jobs via internal secret
    if (triggerJobs) {
      const { baseUrl, from, to } = triggerJobs;
      const headers = { "x-internal-secret": process.env.INTERNAL_JOB_SECRET ?? "", "Content-Type": "application/json" };
      await fetch(`${baseUrl}/api/jobs/usage`, { method: "POST", headers, body: JSON.stringify({ tenantId, locationId, from, to }) });
      await fetch(`${baseUrl}/api/jobs/forecast`, { method: "POST", headers, body: JSON.stringify({ tenantId, locationId, date: to }) });
      await fetch(`${baseUrl}/api/jobs/ordering`, { method: "POST", headers, body: JSON.stringify({ tenantId, locationId, date: to }) });
    }

    return { importRunId, orders: orders.length, items: orderItems.length, modifiers: modifiers.length, voids: voidsComps.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabaseAdmin
      .from("pos_import_runs")
      .update({ status: "failed", error_summary: message, finished_at: new Date().toISOString() })
      .eq("id", importRunId);
    throw err;
  }
}
