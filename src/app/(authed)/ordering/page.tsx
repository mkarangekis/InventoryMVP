"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";

type PurchaseOrderLine = {
  inventory_item_id: string;
  item_name: string;
  qty_units: number;
  unit_price: number;
  line_total: number;
};

type PurchaseOrder = {
  id: string;
  vendor_id: string;
  location_id: string;
  status: string;
  created_at: string;
  vendor: { id: string; name: string; email: string | null } | null;
  lines: PurchaseOrderLine[];
};

export default function OrderingPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const enterpriseEnabled = isEnterpriseUIEnabled();

  const loadOrders = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    setToken(accessToken);

    if (!accessToken) {
      setLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/ordering/drafts${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus(`Error loading draft POs: ${message}`);
      setOrders([]);
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as {
      purchaseOrders: PurchaseOrder[];
    };
    setOrders(payload.purchaseOrders);

    setLoading(false);
  };

  useEffect(() => {
    void loadOrders();

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      () => {
        void loadOrders();
      },
    );

    const handleLocationChange = () => {
      void loadOrders();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("location-change", handleLocationChange);
    }

    return () => {
      subscription.subscription.unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("location-change", handleLocationChange);
      }
    };
  }, []);

  const handleApprove = async (purchaseOrderId: string) => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("Not signed in");
      return;
    }

    const response = await fetch("/api/ordering/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ purchaseOrderId }),
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus(`Error: ${message}`);
      return;
    }

    setStatus("Purchase order approved");
    await loadOrders();
  };

  const handleGenerateDrafts = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("Not signed in");
      return;
    }

    setGenerating(true);
    setStatus(null);

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;

    const response = await fetch("/api/jobs/ordering", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ locationId }),
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus(`Error generating drafts: ${message}`);
      setGenerating(false);
      return;
    }

    const payload = (await response.json()) as { message?: string };
    setStatus(payload.message ?? "Draft purchase orders generated.");
    setGenerating(false);
    await loadOrders();
  };

  const getPoLink = (poId: string, print = false) => {
    if (!token) {
      return "#";
    }
    const printParam = print ? "&print=1" : "";
    return `/api/ordering/po/${poId}?token=${encodeURIComponent(token)}${printParam}`;
  };

  const buildEmailBody = (po: PurchaseOrder) => {
    const lines = po.lines
      .map(
        (line) =>
          `- ${line.item_name}: ${line.qty_units} x $${line.unit_price} = $${line.line_total}`,
      )
      .join("\n");
    return [
      `Purchase Order ${po.id}`,
      "",
      `Vendor: ${po.vendor?.name ?? "Unknown"}`,
      "",
      "Items:",
      lines || "- (no lines)",
      "",
      "Please confirm receipt and expected delivery date.",
    ].join("\n");
  };

  const getMailtoLink = (po: PurchaseOrder) => {
    const subject = `PO ${po.id}`;
    const body = buildEmailBody(po);
    return `mailto:${po.vendor?.email ?? ""}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const totalLines = orders.reduce((sum, po) => sum + po.lines.length, 0);
  const totalCost = orders.reduce(
    (sum, po) =>
      sum +
      po.lines.reduce((lineSum, line) => lineSum + (line.line_total || 0), 0),
    0,
  );
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(value);
  const vendorCount = new Set(
    orders.map((po) => po.vendor?.id ?? po.vendor?.name ?? "unknown"),
  ).size;

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Draft POs + Approve</h1>
        <p className="text-sm text-gray-600">
          Draft purchase orders grouped by vendor.
        </p>
        <button
          className="w-fit rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
          onClick={handleGenerateDrafts}
          disabled={generating}
        >
          {generating ? "Generating..." : "Generate Draft POs"}
        </button>

        {loading ? (
          <p className="text-sm text-gray-600">Loading draft POs...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-600">No draft purchase orders.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((po) => (
              <div key={po.id} className="rounded border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="text-lg font-semibold">
                      {po.vendor?.name ?? "Unknown vendor"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {po.vendor?.email ?? ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
                      href={getPoLink(po.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Print
                    </a>
                    <a
                      className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
                      href={getPoLink(po.id, true)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PDF
                    </a>
                    {po.vendor?.email ? (
                      <a
                        className="rounded border border-gray-300 px-3 py-2 text-xs font-semibold"
                        href={getMailtoLink(po)}
                      >
                        Email vendor
                      </a>
                    ) : null}
                    <button
                      className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => handleApprove(po.id)}
                    >
                      Approve
                    </button>
                  </div>
                </div>

                <table className="mt-4 w-full text-left text-sm">
                  <thead className="text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-1">Item</th>
                      <th className="py-1">Qty</th>
                      <th className="py-1">Unit</th>
                      <th className="py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.lines.map((line) => (
                      <tr
                        key={`${po.id}-${line.inventory_item_id}`}
                        className="border-t"
                      >
                        <td className="py-1">{line.item_name}</td>
                        <td className="py-1">{line.qty_units}</td>
                        <td className="py-1">${line.unit_price}</td>
                        <td className="py-1">${line.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {status ? <p className="text-sm text-gray-700">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Ordering Recommendations
            </h2>
            <p className="app-card-subtitle">
              Draft purchase orders generated from forecasts and current stock.
            </p>
          </div>
          <button
            className="btn-primary btn-sm"
            onClick={handleGenerateDrafts}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Draft POs"}
          </button>
        </div>
        <div className="app-card-body">
          <div className="app-kpi-grid">
            <div className="app-kpi-card">
              <p className="app-kpi-label">Items to Reorder</p>
              <p className="app-kpi-value">{loading ? "—" : totalLines}</p>
              <p className="app-kpi-meta">Across draft orders</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Estimated Cost</p>
              <p className="app-kpi-value">
                {loading ? "—" : formatCurrency(totalCost)}
              </p>
              <p className="app-kpi-meta">Totals before tax</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Vendors</p>
              <p className="app-kpi-value">{loading ? "—" : vendorCount}</p>
              <p className="app-kpi-meta">Drafts ready to send</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Last Sync</p>
              <p className="app-kpi-value">
                {loading ? "—" : new Date().toLocaleTimeString()}
              </p>
              <p className="app-kpi-meta">Auto refresh active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3 className="app-card-title">Draft Purchase Orders</h3>
            <p className="app-card-subtitle">
              Review and approve orders grouped by vendor.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          {loading ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              Loading draft POs...
            </p>
          ) : orders.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-title">No Draft Purchase Orders</div>
              <p className="app-empty-desc">
                Generate draft POs once your forecasts and inventory levels are
                ready.
              </p>
              <div className="app-empty-actions">
                <button
                  className="btn-primary btn-sm"
                  onClick={handleGenerateDrafts}
                  disabled={generating}
                >
                  Generate Draft POs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((po) => (
                <div
                  key={po.id}
                  className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--enterprise-muted)]">
                        Vendor
                      </p>
                      <p className="text-lg font-semibold">
                        {po.vendor?.name ?? "Unknown vendor"}
                      </p>
                      <p className="text-xs text-[var(--enterprise-muted)]">
                        {po.vendor?.email ?? ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        className="btn-secondary btn-sm"
                        href={getPoLink(po.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Print
                      </a>
                      <a
                        className="btn-secondary btn-sm"
                        href={getPoLink(po.id, true)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                      {po.vendor?.email ? (
                        <a
                          className="btn-ghost btn-sm"
                          href={getMailtoLink(po)}
                        >
                          Email vendor
                        </a>
                      ) : null}
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleApprove(po.id)}
                      >
                        Approve
                      </button>
                    </div>
                  </div>

                  <table className="app-table mt-4 w-full text-left text-sm">
                    <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
                      <tr>
                        <th className="py-1">Item</th>
                        <th className="py-1">Qty</th>
                        <th className="py-1">Unit</th>
                        <th className="py-1">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.lines.map((line) => (
                        <tr
                          key={`${po.id}-${line.inventory_item_id}`}
                          className="border-t"
                        >
                          <td className="py-1">{line.item_name}</td>
                          <td className="py-1">{line.qty_units}</td>
                          <td className="py-1">${line.unit_price}</td>
                          <td className="py-1">${line.line_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {status ? (
            <p className="mt-3 text-sm text-[var(--enterprise-muted)]">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
