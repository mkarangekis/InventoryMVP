"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  location_id: string | null;
  user_id: string | null;
  created_at: string;
  user_profiles: { email: string } | null;
};

const ACTION_COLORS: Record<string, string> = {
  create: "#22c55e",
  update: "var(--enterprise-accent)",
  delete: "#ef4444",
  approve: "#3b82f6",
  ingest: "#a78bfa",
  snapshot: "#06b6d4",
  ordering: "#d4a853",
  variance: "#ef4444",
  settings: "#8b949e",
};

const actionColor = (action: string) =>
  ACTION_COLORS[action.split(".")[0]] ?? "var(--enterprise-muted)";

const ACTION_LABELS: Record<string, string> = {
  "ordering.approved":              "Purchase order approved",
  "ordering.sent":                  "PO sent to vendor",
  "ordering.draft_created":         "Draft PO created",
  "inventory.snapshot":             "Inventory count taken",
  "variance.flagged":               "Unaccounted usage flagged",
  "ingest.completed":               "POS data imported",
  "ingest.warning":                 "Import warning",
  "settings.webhook_created":       "Webhook connected",
  "settings.notifications_updated": "Notification settings changed",
  "create":                         "Record created",
  "update":                         "Record updated",
  "delete":                         "Record deleted",
  "approve":                        "Approved",
  "snapshot":                       "Snapshot taken",
};

function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? action;
}

const ENTITY_LABELS: Record<string, string> = {
  purchase_orders:          "Purchase Order",
  purchase_order:           "Purchase Order",
  inventory_snapshots:      "Inventory Count",
  variance_flags:           "Shrinkage Flag",
  pos_import_runs:          "POS Import",
  webhook_endpoints:        "Webhook",
  user_notification_prefs:  "Notification Settings",
  inventory_item:           "Product",
  menu_item:                "Menu Item",
  drink_spec:               "Drink Spec",
  ingredient:               "Ingredient",
};

function entityLabel(entityType: string) {
  return ENTITY_LABELS[entityType] ?? entityType.replace(/_/g, " ");
}

function renderDetails(action: string, details: Record<string, unknown> | null): string {
  if (!details) return "—";
  const d = details as Record<string, unknown>;
  if (action.startsWith("variance")) {
    const item = d.item as string | undefined;
    const usd = d.unaccounted_usd as number | undefined;
    if (item && usd != null) return `${item} — $${usd.toFixed(2)} unaccounted`;
    if (item) return item;
  }
  if (action.startsWith("ordering")) {
    const vendor = d.vendor as string | undefined;
    const total = d.total as number | undefined;
    const lines = d.lines as number | undefined;
    if (vendor && total != null) return `${vendor} · $${(total as number).toFixed(2)}`;
    if (vendor && lines != null) return `${vendor} · ${lines} items`;
    if (vendor) return vendor;
  }
  if (action.startsWith("ingest")) {
    const rows = d.rows_imported as number | undefined;
    const skipped = d.rows_skipped as number | undefined;
    const source = d.source as string | undefined;
    if (rows != null) return `${rows.toLocaleString()} sales records imported${source ? ` (${source})` : ""}`;
    if (skipped != null) return `${skipped} rows skipped — ${d.reason ?? "unknown reason"}`;
  }
  if (action.startsWith("inventory")) {
    const count = d.item_count as number | undefined;
    const by = d.counted_by as string | undefined;
    if (count != null) return `${count} items counted${by ? ` by ${by}` : ""}`;
  }
  // fallback: summarise the first 2 keys
  const entries = Object.entries(d).slice(0, 2);
  return entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ").slice(0, 80);
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const enterpriseEnabled = isEnterpriseUIEnabled();
  const PAGE_SIZE = 50;

  const load = async (pageIdx = 0) => {
    setLoading(true);
    setError(null);
    const { data: session } = await supabaseBrowser.auth.getSession();
    const token = session.session?.access_token;
    if (!token) { setLoading(false); return; }

    const locationId = typeof window !== "undefined"
      ? window.localStorage.getItem("barops.locationId") ?? ""
      : "";

    const params = new URLSearchParams({
      locationId,
      limit: String(PAGE_SIZE),
      offset: String(pageIdx * PAGE_SIZE),
      ...(filterAction ? { action: filterAction } : {}),
      ...(filterEntity ? { entityType: filterEntity } : {}),
    });

    const res = await fetch(`/api/v1/audit?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setError(await res.text());
      setLoading(false);
      return;
    }
    const payload = (await res.json()) as { logs: AuditLog[]; total: number };
    setLogs(payload.logs);
    setTotal(payload.total);
    setPage(pageIdx);
    setLoading(false);
  };

  useEffect(() => { void load(0); }, [filterAction, filterEntity]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));
  const uniqueEntities = Array.from(new Set(logs.map((l) => l.entity_type)));

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-sm text-gray-600">Audit log requires enterprise mode.</p>
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 6 }}>Compliance</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Audit Trail</h1>
          <p style={{ fontSize: 13, color: "#8b949e", marginTop: 6 }}>Every workspace action — who did what, when, and to which record.</p>
        </div>
        {!loading && (
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 10, padding: "10px 18px", textAlign: "right" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#d4a853", fontVariantNumeric: "tabular-nums" }}>{total.toLocaleString()}</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>total events</p>
          </div>
        )}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", background: "#141a22", border: "1px solid #2a3240", borderRadius: 10, padding: "12px 16px" }}>
        <span style={{ fontSize: 11, color: "#8b949e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginRight: 4 }}>Filter</span>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{ background: "#0b1016", border: "1px solid #2a3240", borderRadius: 7, color: "#f0f6fc", padding: "7px 14px", fontSize: 13, outline: "none", cursor: "pointer" }}
        >
          <option value="">All actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          style={{ background: "#0b1016", border: "1px solid #2a3240", borderRadius: 7, color: "#f0f6fc", padding: "7px 14px", fontSize: 13, outline: "none", cursor: "pointer" }}
        >
          <option value="">All entity types</option>
          {uniqueEntities.map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
        </select>
        {(filterAction || filterEntity) && (
          <button
            onClick={() => { setFilterAction(""); setFilterEntity(""); }}
            style={{ fontSize: 12, color: "#d4a853", background: "rgba(212,168,83,0.08)", border: "1px solid rgba(212,168,83,0.3)", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}
          >
            Clear filters
          </button>
        )}
        {(filterAction || filterEntity) && (
          <span style={{ fontSize: 12, color: "#8b949e", marginLeft: "auto" }}>
            Showing {logs.length} of {total.toLocaleString()} events
          </span>
        )}
      </div>

      {/* Table */}
      <div className="app-card">
        <div className="app-card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: 24, color: "var(--enterprise-muted)", fontSize: 13 }}>Loading audit logs...</p>
          ) : error ? (
            <p style={{ padding: 24, color: "#ef4444", fontSize: 13 }}>{error}</p>
          ) : logs.length === 0 ? (
            <div className="app-empty" style={{ padding: 40 }}>
              <div className="app-empty-title">No audit events</div>
              <p className="app-empty-desc">Actions performed in this workspace will appear here.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--enterprise-border)" }}>
                    {["Time", "What Happened", "Type", "Record", "Who", "Details"].map((h) => (
                      <th key={h} style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        color: "var(--enterprise-muted)",
                        fontWeight: 500,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr key={log.id} style={{
                      borderBottom: i < logs.length - 1 ? "1px solid var(--enterprise-border)" : "none",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                    }}>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)", whiteSpace: "nowrap" }}>
                        {formatTime(log.created_at)}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          background: actionColor(log.action) + "22",
                          color: actionColor(log.action),
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontWeight: 600,
                          fontSize: 11,
                          whiteSpace: "nowrap",
                        }}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-fg)" }}>
                        {entityLabel(log.entity_type)}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)", fontFamily: "monospace", fontSize: 11 }}>
                        {log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)" }}>
                        {log.user_profiles?.email ?? (log.user_id ? log.user_id.slice(0, 8) + "…" : "system")}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)", maxWidth: 260 }}>
                        <span title={JSON.stringify(log.details)} style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          maxWidth: 240,
                        }}>
                          {renderDetails(log.action, log.details)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          <button
            type="button"
            disabled={page === 0}
            onClick={() => void load(page - 1)}
            className="btn-secondary btn-sm"
          >
            Previous
          </button>
          <span style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => void load(page + 1)}
            className="btn-secondary btn-sm"
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
