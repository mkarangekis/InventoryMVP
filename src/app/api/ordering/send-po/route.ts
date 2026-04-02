import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getUserScope } from "@/ai/context";
import { Resend } from "resend";

const FROM = "Pourdex <notifications@pourdex.app>";

export async function POST(req: NextRequest) {
  const _scope = await getUserScope(req);
  if (!_scope.ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const scope = _scope;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { purchaseOrderId } = body as { purchaseOrderId?: string };
  if (!purchaseOrderId) return NextResponse.json({ error: "purchaseOrderId required" }, { status: 400 });

  // Fetch PO with lines + vendor
  const { data: po, error: poError } = await supabaseAdmin
    .from("purchase_orders")
    .select(`
      id, status, created_at,
      vendor:vendors(id, name, email),
      location:locations(name),
      lines:purchase_order_lines(
        qty_units, unit_size_oz, unit_price, line_total,
        item:inventory_items(name_override, ingredient:ingredients(name))
      )
    `)
    .eq("id", purchaseOrderId)
    .eq("tenant_id", scope.tenantId)
    .single();

  if (poError || !po) return NextResponse.json({ error: "PO not found" }, { status: 404 });
  if ((po as { status: string }).status === "sent") {
    return NextResponse.json({ error: "PO has already been sent to this vendor" }, { status: 409 });
  }

  const vendor = (po.vendor as unknown) as { id: string; name: string; email: string | null } | null;
  if (!vendor?.email) {
    return NextResponse.json({ error: "Vendor has no email address on file. Add one in vendor settings first." }, { status: 422 });
  }

  const location = (po.location as unknown) as { name: string } | null;
  const lines = ((po.lines ?? []) as unknown) as Array<{
    qty_units: number;
    unit_size_oz: number;
    unit_price: number;
    line_total: number;
    item: { name_override: string | null; ingredient: { name: string } | null } | null;
  }>;

  const totalValue = lines.reduce((sum, l) => sum + Number(l.line_total), 0);
  const formattedDate = new Date(po.created_at as string).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const escHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const lineRows = lines.map((l) => {
    const itemName = escHtml(l.item?.name_override ?? l.item?.ingredient?.name ?? "Unknown Item");
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#e5e5e5;">${itemName}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#e5e5e5;text-align:center;">${l.qty_units}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#e5e5e5;text-align:right;">$${Number(l.unit_price).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2a2a2a;color:#d4a853;text-align:right;font-weight:600;">$${Number(l.line_total).toFixed(2)}</td>
      </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f0e0c;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#1a1916;border:1px solid #2a2926;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1a1916,#22201c);padding:28px 32px;border-bottom:1px solid #2a2926;">
        <div style="font-size:22px;font-weight:800;color:#d4a853;letter-spacing:-0.5px;">Pourdex</div>
        <div style="font-size:13px;color:#8a8782;margin-top:4px;">Purchase Order</div>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#f5f3f0;">Purchase Order from ${location?.name ?? "Bar Operations"}</h2>
        <p style="margin:0 0 24px;font-size:13px;color:#8a8782;">Issued ${formattedDate} · PO #${(purchaseOrderId as string).slice(0, 8).toUpperCase()}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#222;border-radius:8px;">
              <th style="padding:10px 12px;text-align:left;color:#8a8782;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Item</th>
              <th style="padding:10px 12px;text-align:center;color:#8a8782;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Qty</th>
              <th style="padding:10px 12px;text-align:right;color:#8a8782;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Unit Price</th>
              <th style="padding:10px 12px;text-align:right;color:#8a8782;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Total</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:12px;text-align:right;color:#8a8782;font-size:13px;font-weight:600;">Order Total</td>
              <td style="padding:12px;text-align:right;color:#d4a853;font-size:16px;font-weight:800;">$${totalValue.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background:#222;border-radius:8px;padding:16px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#8a8782;">Please confirm receipt of this order and provide an estimated delivery date. Reply directly to this email or contact us at <a href="mailto:pourdex@augmentationcg.com" style="color:#d4a853;">pourdex@augmentationcg.com</a>.</p>
        </div>

        <p style="font-size:12px;color:#555;margin:0;">This purchase order was generated by Pourdex predictive bar operations platform.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email service not configured" }, { status: 503 });

  const resend = new Resend(apiKey);
  const { error: emailError } = await resend.emails.send({
    from: FROM,
    to: vendor.email,
    replyTo: "pourdex@augmentationcg.com",
    subject: `Purchase Order from ${location?.name ?? "Pourdex"} — $${totalValue.toFixed(2)}`,
    html,
  });

  if (emailError) return NextResponse.json({ error: String(emailError) }, { status: 500 });

  // Mark PO as sent
  await supabaseAdmin
    .from("purchase_orders")
    .update({ status: "sent" })
    .eq("id", purchaseOrderId)
    .eq("tenant_id", scope.tenantId);

  return NextResponse.json({ ok: true, sentTo: vendor.email });
}
