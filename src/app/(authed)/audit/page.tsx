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
};

const actionColor = (action: string) =>
  ACTION_COLORS[action.split(".")[0]] ?? "var(--enterprise-muted)";

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
    <section className="space-y-6">
      {/* Header */}
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">Audit Trail</h2>
            <p className="app-card-subtitle">All workspace actions logged with user, entity, and timestamp.</p>
          </div>
          <span style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>
            {total.toLocaleString()} total events
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          style={{
            background: "var(--app-surface-elevated)",
            border: "1px solid var(--enterprise-border)",
            borderRadius: 8,
            color: "var(--enterprise-fg)",
            padding: "6px 12px",
            fontSize: 12,
          }}
        >
          <option value="">All actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          style={{
            background: "var(--app-surface-elevated)",
            border: "1px solid var(--enterprise-border)",
            borderRadius: 8,
            color: "var(--enterprise-fg)",
            padding: "6px 12px",
            fontSize: 12,
          }}
        >
          <option value="">All entity types</option>
          {uniqueEntities.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
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
                    {["Time", "Action", "Entity", "Entity ID", "User", "Details"].map((h) => (
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
                          padding: "2px 6px",
                          fontWeight: 600,
                          fontSize: 11,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-fg)" }}>
                        {log.entity_type}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)", fontFamily: "monospace", fontSize: 11 }}>
                        {log.entity_id ? log.entity_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)" }}>
                        {log.user_profiles?.email ?? (log.user_id ? log.user_id.slice(0, 8) + "…" : "system")}
                      </td>
                      <td style={{ padding: "10px 16px", color: "var(--enterprise-muted)", maxWidth: 220 }}>
                        <span title={JSON.stringify(log.details)} style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                          maxWidth: 200,
                        }}>
                          {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
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
