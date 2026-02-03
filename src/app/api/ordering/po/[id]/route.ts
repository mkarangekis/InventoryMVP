import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";
import { demoPurchaseOrders, isDemoEmail } from "@/lib/demo";

const renderPurchaseOrderHtml = (
  response: {
    id: string;
    status: string;
    created_at: string;
    vendor: { name: string; email: string | null };
    lines: {
      inventory_item_id: string;
      qty_units: number;
      unit_price: number;
      line_total: number;
      item_name: string;
    }[];
  },
  autoPrint: boolean,
) => {
  const title = `PO-${response.id}`;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 8px; }
          table { border-collapse: collapse; width: 100%; margin-top: 16px; }
          th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
          .meta { color: #666; font-size: 12px; }
          .actions { margin-top: 16px; }
          .btn { border: 1px solid #222; padding: 6px 10px; font-size: 12px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Purchase Order</h1>
        <div class="meta">Vendor: ${response.vendor.name}</div>
        <div class="meta">Created: ${response.created_at}</div>
        <div class="actions">
          <button class="btn" onclick="window.print()">Print / Save PDF</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${response.lines
              .map(
                (line) => `
              <tr>
                <td>${line.item_name}</td>
                <td>${line.qty_units}</td>
                <td>$${line.unit_price}</td>
                <td>$${line.line_total}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
        ${
          autoPrint
            ? `<script>
                document.title = "${title}";
                window.print();
                window.onafterprint = () => window.close();
              </script>`
            : ""
        }
      </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const requestUrl = request.url;
  const url = new URL(requestUrl);
  const tokenParam = url.searchParams.get("token");
  const authHeader = request.headers.get("authorization");
  const token = tokenParam ?? authHeader?.replace("Bearer ", "");
  const pathParts = url.pathname.split("/").filter(Boolean);
  const fallbackId = pathParts[pathParts.length - 1];

  if (!token) {
    return new Response("Missing auth token", { status: 401 });
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData.user) {
    return new Response("Invalid auth token", { status: 401 });
  }

  const userId = userData.user.id;
  const poId = id || fallbackId;
  if (!poId) {
    return new Response("Missing purchase order id", { status: 400 });
  }

  if (isDemoEmail(userData.user.email)) {
    const demoPo =
      demoPurchaseOrders.find((po) => po.id === poId) ?? demoPurchaseOrders[0];
    const response = {
      id: demoPo.id,
      status: demoPo.status,
      created_at: demoPo.created_at,
      vendor: demoPo.vendor ?? { name: "Unknown", email: null },
      lines: demoPo.lines,
    };
    const autoPrint = url.searchParams.get("print") === "1";
    return renderPurchaseOrderHtml(response, autoPrint);
  }

  const po = await supabaseAdmin
    .from("purchase_orders")
    .select("id,vendor_id,location_id,status,created_at")
    .eq("id", poId)
    .maybeSingle();

  if (po.error) {
    return new Response(po.error.message, { status: 500 });
  }

  if (!po.data) {
    return new Response("Purchase order not found", { status: 404 });
  }

  const access = await supabaseAdmin
    .from("user_locations")
    .select("location_id")
    .eq("user_id", userId)
    .eq("location_id", po.data.location_id)
    .maybeSingle();

  if (!access.data) {
    return new Response("No access to location", { status: 403 });
  }

  const lines = await supabaseAdmin
    .from("purchase_order_lines")
    .select("inventory_item_id,qty_units,unit_price,line_total")
    .eq("purchase_order_id", poId);

  const vendor = await supabaseAdmin
    .from("vendors")
    .select("name,email")
    .eq("id", po.data.vendor_id)
    .maybeSingle();

  const inventoryItemIds = Array.from(
    new Set((lines.data ?? []).map((row) => row.inventory_item_id)),
  );

  const items = inventoryItemIds.length
    ? await supabaseAdmin
        .from("inventory_items")
        .select("id,name_override,ingredient_id")
        .in("id", inventoryItemIds)
    : { data: [] };

  const ingredientIds = Array.from(
    new Set((items.data ?? []).map((row) => row.ingredient_id)),
  );

  const ingredients = ingredientIds.length
    ? await supabaseAdmin
        .from("ingredients")
        .select("id,name")
        .in("id", ingredientIds)
    : { data: [] };

  const ingredientMap = new Map(
    (ingredients.data ?? []).map((row) => [row.id, row.name]),
  );

  const itemMap = new Map(
    (items.data ?? []).map((row) => [
      row.id,
      row.name_override || ingredientMap.get(row.ingredient_id) || "Unknown",
    ]),
  );

  const response = {
    id: po.data.id,
    status: po.data.status,
    created_at: po.data.created_at,
    vendor: vendor.data ?? { name: "Unknown", email: null },
    lines: (lines.data ?? []).map((line) => ({
      ...line,
      item_name: itemMap.get(line.inventory_item_id) ?? "Unknown",
    })),
  };

  const autoPrint = url.searchParams.get("print") === "1";
  return renderPurchaseOrderHtml(response, autoPrint);
}
