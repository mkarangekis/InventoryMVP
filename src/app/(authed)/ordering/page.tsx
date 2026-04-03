"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
import { AiOrderingSummary } from "@/ai/types";
import { isAiTopPanelEnabled, isGraphsOverviewEnabled } from "@/config/flags";
import { BarChart } from "@/components/charts/BarChart";

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
  const [aiSummary, setAiSummary] = useState<AiOrderingSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const enterpriseEnabled = isEnterpriseUIEnabled();
  const aiTopEnabled = isAiTopPanelEnabled();
  const graphsEnabled = isGraphsOverviewEnabled();

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

  const loadAi = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const accessToken = data.session?.access_token ?? null;
    if (!accessToken) {
      setAiLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/v1/ai/order-summary${query}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 404) {
      setAiEnabled(false);
      setAiLoading(false);
      return;
    }

    if (response.ok) {
      setAiSummary((await response.json()) as AiOrderingSummary);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    void loadOrders();
    void loadAi();

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      () => {
        void loadOrders();
      },
    );

    const handleLocationChange = () => {
      void loadOrders();
      void loadAi();
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

  const [sendingPoId, setSendingPoId] = useState<string | null>(null);

  const handleSendToVendor = async (purchaseOrderId: string) => {
    if (sendingPoId) return; // prevent double-send
    const { data } = await supabaseBrowser.auth.getSession();
    const tok = data.session?.access_token;
    if (!tok) { setStatus("Not signed in"); return; }
    setSendingPoId(purchaseOrderId);
    setStatus("Sending PO to vendor...");
    const res = await fetch("/api/ordering/send-po", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ purchaseOrderId }),
    });
    if (!res.ok) {
      const msg = await res.text();
      setStatus(`Error sending PO: ${msg}`);
      setSendingPoId(null);
      return;
    }
    const payload = (await res.json()) as { sentTo?: string };
    setStatus(`PO sent to ${payload.sentTo ?? "vendor"}`);
    setSendingPoId(null);
    await loadOrders();
    setTimeout(() => setStatus(null), 5000);
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

  const vendorTotals = (() => {
    const map = new Map<string, { label: string; total: number }>();
    for (const po of orders) {
      const key = po.vendor?.id ?? po.vendor?.name ?? "unknown";
      const label = po.vendor?.name ?? "Unknown vendor";
      const poTotal = po.lines.reduce((s, l) => s + (l.line_total || 0), 0);
      const prev = map.get(key) ?? { label, total: 0 };
      map.set(key, { label: prev.label, total: prev.total + poTotal });
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  const topItems = (() => {
    const map = new Map<string, { label: string; total: number }>();
    for (const po of orders) {
      for (const line of po.lines) {
        const key = line.inventory_item_id;
        const label = line.item_name;
        const prev = map.get(key) ?? { label, total: 0 };
        map.set(key, { label: prev.label, total: prev.total + (line.qty_units || 0) });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  })();

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Draft POs + Approve</h1>
        <p className="text-sm text-gray-600">
          Draft purchase orders grouped by vendor.
        </p>

        <AIInsightsTopPanel
          pageContext="ordering"
          loading={aiLoading}
          error={
            !aiEnabled
              ? "AI ordering copilot is not enabled for this workspace."
              : !aiSummary
                ? "AI summary not available yet."
                : null
          }
          summary={aiSummary?.summary ?? null}
          recommendations={(aiSummary?.top_actions ?? []).map((a) => ({
            action: a.action,
            reason: a.reason,
            urgency: a.urgency,
          }))}
          risks={(aiSummary?.risk_notes ?? []).map((r) => ({
            risk: r.risk,
            impact: r.impact,
          }))}
        />

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
              <p className="app-kpi-value" style={{ color: "#d4a853" }}>{loading ? "—" : totalLines}</p>
              <p className="app-kpi-meta">Across draft orders</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Estimated Cost</p>
              <p className="app-kpi-value" style={{ color: "#f0f6fc" }}>
                {loading ? "—" : formatCurrency(totalCost)}
              </p>
              <p className="app-kpi-meta">Totals before tax</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Vendors</p>
              <p className="app-kpi-value" style={{ color: "#d4a853" }}>{loading ? "—" : vendorCount}</p>
              <p className="app-kpi-meta">Drafts ready to send</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Last Sync</p>
              <p className="app-kpi-value" style={{ color: "#22c55e" }}>
                {loading ? "—" : new Date().toLocaleTimeString()}
              </p>
              <p className="app-kpi-meta">Auto refresh active</p>
            </div>
          </div>
        </div>
      </div>

      <AIInsightsTopPanel
        pageContext="ordering"
        loading={aiLoading}
        error={
          !aiEnabled
            ? "AI ordering copilot is not enabled for this workspace."
            : !aiSummary
              ? "AI summary not available yet."
              : null
        }
        summary={aiSummary?.summary ?? null}
        recommendations={(aiSummary?.top_actions ?? []).map((a) => ({
          action: a.action,
          reason: a.reason,
          urgency: a.urgency,
        }))}
        risks={(aiSummary?.risk_notes ?? []).map((r) => ({
          risk: r.risk,
          impact: r.impact,
        }))}
      />

      {graphsEnabled ? (
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Ordering Breakdown</h3>
              <p className="app-card-subtitle">
                Chart-first view of recommended draft orders.
              </p>
            </div>
          </div>
          <div className="app-card-body">
            {loading ? (
              <p className="text-sm text-[var(--enterprise-muted)]">
                Loading ordering charts…
              </p>
            ) : orders.length === 0 ? (
              <div className="app-empty">
                <div className="app-empty-title">No Draft Orders</div>
                <p className="app-empty-desc">
                  Generate draft POs to see breakdown charts.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--enterprise-ink)]">
                    Estimated cost by vendor
                  </div>
                  <div className="mt-2">
                    <BarChart
                      data={vendorTotals.map((v) => ({
                        label: v.label,
                        value: v.total,
                        color: "var(--enterprise-accent)",
                      }))}
                      valueFormat={(v) =>
                        new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 0,
                        }).format(v)
                      }
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--enterprise-ink)]">
                    Top items by units
                  </div>
                  <div className="mt-2">
                    <BarChart
                      data={topItems.map((i) => ({
                        label: i.label,
                        value: i.total,
                        color: "var(--enterprise-accent)",
                      }))}
                      valueFormat={(v) => `${v.toFixed(0)} units`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

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
              {orders.map((po) => {
                const poTotal = po.lines.reduce((s, l) => s + (l.line_total || 0), 0);
                const statusClass =
                  po.status === "approved" ? "app-badge app-badge-green" :
                  po.status === "sent" ? "app-badge app-badge-blue" :
                  "app-badge app-badge-gold";
                return (
                  <div
                    key={po.id}
                    style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}
                  >
                    {/* PO card header */}
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2732", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e", marginBottom: 3 }}>Vendor</p>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "#f0f6fc" }}>{po.vendor?.name ?? "Unknown vendor"}</p>
                          {po.vendor?.email && (
                            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{po.vendor.email}</p>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 11, color: "#8b949e", marginBottom: 3 }}>{po.lines.length} line{po.lines.length !== 1 ? "s" : ""}</p>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "#f0f6fc", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(poTotal)}</p>
                          <span className={statusClass} style={{ marginTop: 4, display: "inline-block" }}>{po.status}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <a className="btn-secondary btn-sm" href={getPoLink(po.id)} target="_blank" rel="noreferrer">Print</a>
                        <a className="btn-secondary btn-sm" href={getPoLink(po.id, true)} target="_blank" rel="noreferrer">PDF</a>
                        {po.vendor?.email ? (
                          <button
                            className="btn-ghost btn-sm"
                            onClick={() => void handleSendToVendor(po.id)}
                            disabled={po.status === "sent" || sendingPoId === po.id}
                            title={po.status === "sent" ? "Already sent" : `Send PO to ${po.vendor.email}`}
                          >
                            {sendingPoId === po.id ? "Sending..." : po.status === "sent" ? "Sent ✓" : "Send to Vendor"}
                          </button>
                        ) : null}
                        <button className="btn-primary btn-sm" onClick={() => handleApprove(po.id)}>
                          Approve PO
                        </button>
                      </div>
                    </div>

                    {/* PO line items table */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1f2732" }}>
                          {["Item", "Qty", "Unit Price", "Line Total"].map((h) => (
                            <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {po.lines.map((line, j) => (
                          <tr key={`${po.id}-${line.inventory_item_id}`} style={{ borderBottom: j < po.lines.length - 1 ? "1px solid #1a2230" : "none" }}>
                            <td style={{ padding: "9px 16px", color: "#f0f6fc" }}>{line.item_name}</td>
                            <td style={{ padding: "9px 16px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{line.qty_units}</td>
                            <td style={{ padding: "9px 16px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{formatCurrency(line.unit_price)}</td>
                            <td style={{ padding: "9px 16px", color: "#d4a853", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatCurrency(line.line_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}

          {status ? (
            <p className="mt-3 text-sm text-[var(--enterprise-muted)]">
              {status}
            </p>
          ) : null}
        </div>
      </div>

      {!aiTopEnabled && aiEnabled ? (
        <AiCard
          title="AI Ordering Copilot"
          subtitle="Natural-language summary of reorder recommendations."
          loading={aiLoading}
          error={!aiSummary ? "AI summary not available yet." : null}
          footer={
            aiSummary ? (
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  void navigator.clipboard.writeText(aiSummary.summary);
                }}
              >
                Copy summary
              </button>
            ) : null
          }
        >
          <div className="space-y-4 text-sm">
            <p className="text-[var(--enterprise-muted)]">{aiSummary?.summary}</p>
            {aiSummary?.top_actions.length ? (
              <div>
                <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Top actions
                </div>
                <ul className="mt-2 space-y-2">
                  {aiSummary.top_actions.map((action) => (
                    <li key={action.action} className="flex items-start gap-2">
                      <span className="app-pill">{action.urgency}</span>
                      <div>
                        <div className="font-semibold">{action.action}</div>
                        <div className="text-xs text-[var(--enterprise-muted)]">
                          {action.reason}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {aiSummary?.risk_notes.length ? (
              <div>
                <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Risks to watch
                </div>
                <ul className="mt-2 list-disc pl-4 text-[var(--enterprise-muted)]">
                  {aiSummary.risk_notes.map((risk) => (
                    <li key={risk.risk}>
                      <span className="font-semibold text-[var(--enterprise-ink)]">
                        {risk.risk}
                      </span>{" "}
                      — {risk.impact}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AiCard>
      ) : null}
    </section>
  );
}
