import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoEmail } from "@/lib/demo";
import { CsvAdapter } from "@/lib/pos/adapters/csvAdapter";
import { parseCsv } from "@/lib/pos/csv";

const requiredFiles = ["orders", "order_items", "modifiers", "voids_comps"];

const parseNumber = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
    token,
  );

  if (userError || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  if (isDemoEmail(userData.user.email)) {
    return Response.json({
      ok: true,
      jobResults: {
        import: { ok: true },
        usage: { ok: true },
        forecast: { ok: true },
        ordering: { ok: true },
      },
    });
  }

  const formData = await request.formData();
  const locationId = String(formData.get("location_id") ?? "").trim();

  if (!locationId) {
    return new Response("Missing location_id", { status: 400 });
  }

  for (const key of requiredFiles) {
    if (!formData.get(key)) {
      return new Response(`Missing file: ${key}`, { status: 400 });
    }
  }

  const userId = userData.user.id;

  const profile = await supabaseAdmin
    .from("user_profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile.data) {
    return new Response("User profile not found", { status: 403 });
  }

  const tenantId = profile.data.tenant_id as string;

  const locationAccess = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", locationId)
    .maybeSingle();

  if (!locationAccess.data) {
    return new Response("No access to location", { status: 403 });
  }

  const files = {
    orders: formData.get("orders") as File,
    orderItems: formData.get("order_items") as File,
    modifiers: formData.get("modifiers") as File,
    voidsComps: formData.get("voids_comps") as File,
  };

  const [ordersCsv, orderItemsCsv, modifiersCsv, voidsCompsCsv] =
    await Promise.all([
      files.orders.text(),
      files.orderItems.text(),
      files.modifiers.text(),
      files.voidsComps.text(),
    ]);

  const validationErrors = [
    ...parseCsv(ordersCsv, [
      "pos_order_id",
      "opened_at",
      "closed_at",
      "subtotal",
      "tax",
      "total",
      "status",
    ]).errors,
    ...parseCsv(orderItemsCsv, [
      "pos_item_id",
      "pos_order_id",
      "pos_menu_item_id",
      "item_name",
      "quantity",
      "price_each",
    ]).errors,
    ...parseCsv(modifiersCsv, ["pos_item_id", "name", "price_delta"]).errors,
    ...parseCsv(voidsCompsCsv, ["pos_item_id", "type", "reason", "amount"]).
      errors,
  ];

  if (validationErrors.length > 0) {
    return new Response(validationErrors.join("\n"), { status: 400 });
  }

  const importRun = await supabaseAdmin
    .from("pos_import_runs")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      source: "csv",
      status: "processing",
    })
    .select("id")
    .single();

  if (importRun.error) {
    return new Response(importRun.error.message, { status: 500 });
  }

  const importRunId = importRun.data.id as string;

  try {
    const adapter = new CsvAdapter({
      orders: ordersCsv,
      orderItems: orderItemsCsv,
      modifiers: modifiersCsv,
      voidsComps: voidsCompsCsv,
    });

    const menuItems = await adapter.listMenuItems();
    const orders = await adapter.importOrders({ from: "", to: "" });
    const orderItems = await adapter.importOrderItems({ from: "", to: "" });
    const modifiers = await adapter.importModifiers({ from: "", to: "" });
    const voidsComps = await adapter.importVoidsComps({ from: "", to: "" });

    const existingMenuItems = await supabaseAdmin
      .from("menu_items")
      .select("id,pos_menu_item_id")
      .eq("location_id", locationId)
      .in(
        "pos_menu_item_id",
        menuItems.map((item) => item.posMenuItemId),
      );

    const existingMap = new Map<string, string>();
    for (const item of existingMenuItems.data ?? []) {
      if (item.pos_menu_item_id) {
        existingMap.set(item.pos_menu_item_id, item.id);
      }
    }

    const menuInserts = menuItems
      .filter((item) => !existingMap.has(item.posMenuItemId))
      .map((item) => ({
        tenant_id: tenantId,
        location_id: locationId,
        pos_menu_item_id: item.posMenuItemId,
        name: item.name,
        is_active: 1,
      }));

    if (menuInserts.length > 0) {
      const menuInsert = await supabaseAdmin
        .from("menu_items")
        .insert(menuInserts)
        .select("id,pos_menu_item_id");

      for (const item of menuInsert.data ?? []) {
        if (item.pos_menu_item_id) {
          existingMap.set(item.pos_menu_item_id, item.id);
        }
      }
    }

    const orderInserts = orders.map((order) => ({
      tenant_id: tenantId,
      location_id: locationId,
      pos_order_id: order.posOrderId,
      opened_at: order.openedAt,
      closed_at: order.closedAt,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      status: order.status,
    }));

    if (orderInserts.length > 0) {
      await supabaseAdmin.from("pos_orders").insert(orderInserts);
    }

    const itemInserts = orderItems.map((item) => ({
      tenant_id: tenantId,
      location_id: locationId,
      pos_item_id: item.posItemId,
      pos_order_id: item.posOrderId,
      menu_item_id: existingMap.get(item.posMenuItemId) ?? null,
      name: item.itemName,
      quantity: item.quantity,
      price_each: item.priceEach,
      gross: parseNumber(String(item.quantity)) * item.priceEach,
    }));

    if (itemInserts.length > 0) {
      await supabaseAdmin.from("pos_order_items").insert(itemInserts);
    }

    const modifierInserts = modifiers.map((modifier) => ({
      tenant_id: tenantId,
      location_id: locationId,
      pos_item_id: modifier.posItemId,
      name: modifier.name,
      price_delta: modifier.priceDelta,
    }));

    if (modifierInserts.length > 0) {
      await supabaseAdmin.from("pos_modifiers").insert(modifierInserts);
    }

    const voidCompInserts = voidsComps.map((row) => ({
      tenant_id: tenantId,
      location_id: locationId,
      pos_item_id: row.posItemId,
      type: row.type,
      reason: row.reason,
      amount: row.amount,
    }));

    if (voidCompInserts.length > 0) {
      await supabaseAdmin.from("pos_voids_comps").insert(voidCompInserts);
    }

    const rawRows: {
      tenant_id: string;
      location_id: string;
      import_run_id: string;
      row_type: string;
      row_number: number;
      row_data: Record<string, string>;
    }[] = [];

    const pushRows = (type: string, csv: string) => {
      const { rows } = parseCsv(csv, []);
      rows.forEach((row, index) => {
        rawRows.push({
          tenant_id: tenantId,
          location_id: locationId,
          import_run_id: importRunId,
          row_type: type,
          row_number: index + 1,
          row_data: row,
        });
      });
    };

    pushRows("orders", ordersCsv);
    pushRows("order_items", orderItemsCsv);
    pushRows("modifiers", modifiersCsv);
    pushRows("voids_comps", voidsCompsCsv);

    if (rawRows.length > 0) {
      await supabaseAdmin.from("pos_import_rows").insert(rawRows);
    }

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      location_id: locationId,
      user_id: userId,
      action: "ingest_csv",
      entity_type: "pos_import_runs",
      entity_id: importRunId,
      details: {
        orders: orders.length,
        items: orderItems.length,
        modifiers: modifiers.length,
        voids: voidsComps.length,
      },
    });

    await supabaseAdmin
      .from("pos_import_runs")
      .update({ status: "completed", finished_at: new Date().toISOString() })
      .eq("id", importRunId);

    const runJob = async (path: string, body: Record<string, unknown>) => {
      const baseUrl = new URL(request.url).origin;
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, body: text };
    };

    const dates = orders
      .map((order) => order.closedAt)
      .filter(Boolean)
      .map((value) => new Date(value));
    const minDate = dates.length
      ? new Date(Math.min(...dates.map((date) => date.getTime())))
      : new Date();
    const maxDate = dates.length
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : new Date();
    const from = minDate.toISOString().slice(0, 10);
    const to = maxDate.toISOString().slice(0, 10);

    const importJob = await runJob("/api/jobs/import", {
      runId: importRunId,
      locationId,
    });
    const usageJob = await runJob("/api/jobs/usage", {
      from,
      to,
      locationId,
    });
    const forecastJob = await runJob("/api/jobs/forecast", { locationId });
    const orderingJob = await runJob("/api/jobs/ordering", { locationId });

    const jobResults = {
      import: importJob,
      usage: usageJob,
      forecast: forecastJob,
      ordering: orderingJob,
    };

    console.info("CSV import completed", { importRunId });

    return Response.json({ ok: true, importRunId, jobResults });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await supabaseAdmin
      .from("pos_import_runs")
      .update({
        status: "failed",
        error_summary: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", importRunId);

    console.error("CSV import failed", { importRunId, message });
    return new Response(message, { status: 500 });
  }
}
