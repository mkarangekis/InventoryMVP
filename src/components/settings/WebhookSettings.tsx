"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { WEBHOOK_EVENTS } from "@/lib/webhooks";

type Endpoint = {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered: string | null;
};

export function WebhookSettings() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getToken = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const load = async () => {
    const tok = await getToken();
    if (!tok) return;
    const res = await fetch("/api/v1/webhooks", { headers: { Authorization: `Bearer ${tok}` } });
    if (res.ok) {
      const payload = (await res.json()) as { endpoints: Endpoint[] };
      setEndpoints(payload.endpoints);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const add = async () => {
    setError(null);
    if (!newUrl.trim() || !newEvents.length) {
      setError("URL and at least one event type are required.");
      return;
    }
    setAdding(true);
    const tok = await getToken();
    if (!tok) { setAdding(false); return; }

    const res = await fetch("/api/v1/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ url: newUrl, description: newDesc, events: newEvents }),
    });

    if (!res.ok) {
      setError(await res.text());
    } else {
      const payload = (await res.json()) as { secret?: string };
      setNewSecret(payload.secret ?? null);
      setNewUrl(""); setNewDesc(""); setNewEvents([]);
      await load();
    }
    setAdding(false);
  };

  const toggle = async (ep: Endpoint) => {
    if (togglingId) return;
    setTogglingId(ep.id);
    const tok = await getToken();
    if (!tok) { setTogglingId(null); return; }
    await fetch(`/api/v1/webhooks/${ep.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
      body: JSON.stringify({ is_active: !ep.is_active }),
    });
    await load();
    setTogglingId(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this webhook endpoint?")) return;
    const tok = await getToken();
    if (!tok) return;
    await fetch(`/api/v1/webhooks/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tok}` },
    });
    await load();
  };

  const toggleEvent = (event: string) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">Webhooks</h3>
          <p className="app-card-subtitle">
            POST JSON to your endpoints when events occur. Signed with HMAC-SHA256.
          </p>
        </div>
        {endpoints.length > 0 && (
          <span style={{
            fontSize: 12,
            color: "var(--enterprise-muted)",
            background: "var(--app-surface-elevated)",
            borderRadius: 6,
            padding: "2px 8px",
            border: "1px solid var(--enterprise-border)",
          }}>
            {endpoints.filter((e) => e.is_active).length} active
          </span>
        )}
      </div>
      <div className="app-card-body">
        {newSecret && (
          <div style={{
            background: "rgba(34,197,94,0.08)",
            border: "1px solid #22c55e",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 16,
          }}>
            <p style={{ fontSize: 12, color: "#22c55e", fontWeight: 600, marginBottom: 4 }}>
              Webhook created — save your signing secret now. It won't be shown again.
            </p>
            <code style={{
              fontFamily: "monospace",
              fontSize: 12,
              color: "#e5e0d8",
              wordBreak: "break-all",
              display: "block",
              background: "var(--app-surface)",
              padding: "8px 10px",
              borderRadius: 6,
            }}>
              {newSecret}
            </code>
            <button
              type="button"
              onClick={() => { void navigator.clipboard.writeText(newSecret); }}
              style={{ marginTop: 6, fontSize: 11, color: "#22c55e", background: "none", border: "none", cursor: "pointer" }}
            >
              Copy to clipboard
            </button>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              style={{ marginTop: 6, marginLeft: 12, fontSize: 11, color: "var(--enterprise-muted)", background: "none", border: "none", cursor: "pointer" }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Existing endpoints */}
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--enterprise-muted)" }}>Loading endpoints...</p>
        ) : endpoints.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--enterprise-muted)", marginBottom: 20 }}>
            No webhook endpoints configured. Add one below.
          </p>
        ) : (
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {endpoints.map((ep) => (
              <div key={ep.id} style={{
                background: "var(--app-surface-elevated)",
                border: "1px solid var(--enterprise-border)",
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: ep.is_active ? "#22c55e" : "#555",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--enterprise-fg)", wordBreak: "break-all" }}>
                      {ep.url}
                    </span>
                  </div>
                  {ep.description && (
                    <p style={{ fontSize: 12, color: "var(--enterprise-muted)", marginBottom: 4 }}>{ep.description}</p>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {ep.events.map((evt) => (
                      <span key={evt} style={{
                        fontSize: 10,
                        background: "rgba(212,168,83,0.1)",
                        color: "var(--enterprise-accent)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        border: "1px solid rgba(212,168,83,0.2)",
                      }}>{evt}</span>
                    ))}
                  </div>
                  {ep.last_triggered && (
                    <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginTop: 4 }}>
                      Last triggered: {new Date(ep.last_triggered).toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => void toggle(ep)}
                    disabled={togglingId === ep.id}
                    style={{
                      fontSize: 11,
                      color: ep.is_active ? "var(--enterprise-muted)" : "#22c55e",
                      background: "none",
                      border: `1px solid ${ep.is_active ? "var(--enterprise-border)" : "#22c55e"}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                      cursor: togglingId === ep.id ? "not-allowed" : "pointer",
                      opacity: togglingId === ep.id ? 0.6 : 1,
                    }}
                  >
                    {togglingId === ep.id ? "..." : ep.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(ep.id)}
                    style={{
                      fontSize: 11,
                      color: "#ef4444",
                      background: "none",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new endpoint */}
        <div style={{
          background: "var(--app-surface-elevated)",
          border: "1px solid var(--enterprise-border)",
          borderRadius: 10,
          padding: 16,
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--enterprise-fg)", marginBottom: 10 }}>
            Add endpoint
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://your-server.com/webhook"
              style={{
                background: "var(--app-surface)",
                border: "1px solid var(--enterprise-border)",
                borderRadius: 8,
                color: "var(--enterprise-fg)",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{
                background: "var(--app-surface)",
                border: "1px solid var(--enterprise-border)",
                borderRadius: 8,
                color: "var(--enterprise-fg)",
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
              }}
            />
            <div>
              <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginBottom: 6 }}>Events to subscribe</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {WEBHOOK_EVENTS.map((evt) => (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvent(evt)}
                    style={{
                      fontSize: 11,
                      background: newEvents.includes(evt) ? "rgba(212,168,83,0.15)" : "transparent",
                      color: newEvents.includes(evt) ? "var(--enterprise-accent)" : "var(--enterprise-muted)",
                      border: `1px solid ${newEvents.includes(evt) ? "var(--enterprise-accent)" : "var(--enterprise-border)"}`,
                      borderRadius: 6,
                      padding: "3px 8px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {evt}
                  </button>
                ))}
              </div>
            </div>
            {error && <p style={{ fontSize: 12, color: "#ef4444" }}>{error}</p>}
            <button
              type="button"
              onClick={() => void add()}
              disabled={adding || !newUrl.trim() || !newEvents.length}
              className="btn-primary btn-sm"
              style={{ alignSelf: "flex-start" }}
            >
              {adding ? "Adding..." : "Add Endpoint"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
