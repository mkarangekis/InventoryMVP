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
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 6 }}>Procurement</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Ordering</h1>
          <p style={{ fontSize: 13, color: "#8b949e", marginTop: 6 }}>AI-generated draft POs from forecasts. Review, approve, and send to vendors.</p>
        </div>
        <button
          style={{ background: "#d4a853", color: "#0b1016", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.6 : 1, flexShrink: 0 }}
          onClick={handleGenerateDrafts}
          disabled={generating}
        >
          {generating ? "Generating…" : "Generate Draft POs"}
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Items to Reorder", value: loading ? "—" : String(totalLines), meta: "Across all vendors", color: "#d4a853" },
          { label: "Estimated Cost", value: loading ? "—" : formatCurrency(totalCost), meta: "Before tax", color: "#f0f6fc" },
          { label: "Vendors", value: loading ? "—" : String(vendorCount), meta: "Drafts ready to send", color: "#d4a853" },
          { label: "Last Sync", value: loading ? "—" : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), meta: "Auto-refresh active", color: "#22c55e" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: kpi.color, marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>{kpi.meta}</p>
          </div>
        ))}
      </div>

      {/* ── AI Insights ── */}
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

      {/* ── Ordering Breakdown Charts ── */}
      {graphsEnabled && orders.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 16 }}>Cost by Vendor</p>
            <BarChart
              variant="horizontal"
              data={vendorTotals.map((v) => ({ label: v.label, value: v.total, color: "#d4a853" }))}
              valueFormat={(v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v)}
            />
          </div>
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 16 }}>Top Items by Units</p>
            <BarChart
              variant="horizontal"
              data={topItems.map((i) => ({ label: i.label, value: i.total, color: "#22c55e" }))}
              valueFormat={(v) => `${v.toFixed(0)} units`}
            />
          </div>
        </div>
      ) : null}

      {/* ── Draft Purchase Orders ── */}
      <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Draft Purchase Orders</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Review and approve orders grouped by vendor</p>
          </div>
          {!loading && orders.length > 0 && (
            <span style={{ fontSize: 12, color: "#d4a853", fontWeight: 600 }}>{orders.length} draft{orders.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        <div style={{ padding: "16px 20px" }}>
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
                const statusLabel =
                  po.status === "approved" ? "Approved" :
                  po.status === "sent" ? "Sent to vendor" :
                  "Ready to review";
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
                          <span className={statusClass} style={{ marginTop: 4, display: "inline-block" }}>{statusLabel}</span>
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

      {!aiTopEnabled && aiEnabled && aiSummary ? (
        <AiCard
          title="AI Ordering Copilot"
          subtitle="Natural-language summary of reorder recommendations."
          loading={aiLoading}
          error={!aiSummary ? "AI summary not available yet." : null}
          footer={
            <button
              style={{ fontSize: 12, color: "#d4a853", background: "transparent", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}
              onClick={() => void navigator.clipboard.writeText(aiSummary.summary)}
            >
              Copy summary
            </button>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {aiSummary.summary && (
              <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6, borderLeft: "2px solid rgba(212,168,83,0.4)", paddingLeft: 12 }}>
                {aiSummary.summary}
              </p>
            )}
            {aiSummary.top_actions.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#22c55e", marginBottom: 8 }}>Top Actions</p>
                {aiSummary.top_actions.map((action) => (
                  <div key={action.action} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: action.urgency === "high" ? "rgba(239,68,68,0.12)" : "rgba(212,168,83,0.12)", color: action.urgency === "high" ? "#ef4444" : "#d4a853", border: `1px solid ${action.urgency === "high" ? "#ef444433" : "#d4a85333"}`, flexShrink: 0, marginTop: 1 }}>{action.urgency === "high" ? "Do now" : action.urgency === "med" ? "Soon" : "Optional"}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f6fc" }}>{action.action}</div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{action.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {aiSummary.risk_notes.length > 0 && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#ef4444", marginBottom: 8 }}>Risks to Watch</p>
                {aiSummary.risk_notes.map((risk) => (
                  <div key={risk.risk} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ color: "#ef4444", fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f6fc" }}>{risk.risk}</div>
                      <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{risk.impact}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AiCard>
      ) : null}
    </section>
  );
}
