"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type PosConnection = {
  id: string;
  location_id: string;
  pos_type: "toast" | "skytab" | "square";
  status: "pending" | "active" | "error" | "disconnected";
  sftp_username?: string | null;
  sftp_path?: string | null;
  ingest_email?: string | null;
  square_merchant_id?: string | null;
  square_location_id?: string | null;
  last_import_at?: string | null;
  last_file_received_at?: string | null;
  last_error?: string | null;
  files_received_total?: number;
  created_at: string;
};

type Location = { id: string; name: string };

const POS_META = {
  toast: { label: "Toast", color: "#e8572a", desc: "Nightly SFTP export" },
  skytab: { label: "SkyTab", color: "#0a7abf", desc: "Email report ingest" },
  square: { label: "Square", color: "#3e4348", desc: "Live API sync" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Connected", cls: "badge-success" },
    pending: { label: "Setup pending", cls: "badge-warning" },
    error: { label: "Error", cls: "badge-danger" },
    disconnected: { label: "Disconnected", cls: "badge" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "badge" };
  return <span className={cls}>{label}</span>;
};

const fmtDate = (val: string | null | undefined) =>
  val ? new Date(val).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "Never";

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<PosConnection[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [setupType, setSetupType] = useState<"toast" | "skytab" | "square" | null>(null);
  const [setupLocationId, setSetupLocationId] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const tok = data.session?.access_token ?? null;
    setToken(tok);
    if (!tok) { setLoading(false); return; }

    const [connRes, locRes] = await Promise.all([
      fetch("/api/integrations/pos", { headers: { Authorization: `Bearer ${tok}` } }),
      fetch("/api/locations", { headers: { Authorization: `Bearer ${tok}` } }),
    ]);

    if (connRes.ok) {
      const j = await connRes.json();
      setConnections(j.connections ?? []);
    }
    if (locRes.ok) {
      const j = await locRes.json();
      setLocations(j.locations ?? []);
    }
    setLoading(false);
  };

  const handleSetup = async () => {
    if (!setupType || !setupLocationId || !token) return;
    setSetupBusy(true);
    setSetupError(null);

    if (setupType === "square") {
      // Redirect to Square OAuth
      window.location.href = `/api/integrations/square/connect?locationId=${setupLocationId}`;
      return;
    }

    const res = await fetch("/api/integrations/pos", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: setupLocationId, posType: setupType }),
    });

    if (!res.ok) {
      setSetupError(await res.text());
      setSetupBusy(false);
      return;
    }

    setSetupType(null);
    setSetupLocationId("");
    setSetupBusy(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    await fetch(`/api/integrations/pos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setDeleteId(null);
    await load();
  };

  const connectedTypes = new Set(connections.map((c) => c.pos_type));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">POS Integrations</h1>
          <p className="page-subtitle">Connect your point-of-sale system to automatically import sales data every night.</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading connections...</div>
      ) : (
        <>
          {/* Active connections */}
          {connections.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h2 className="section-title" style={{ marginBottom: "1rem" }}>Active connections</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {connections.map((conn) => {
                  const meta = POS_META[conn.pos_type];
                  return (
                    <div key={conn.id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{meta.label}</span>
                            <StatusBadge status={conn.status} />
                            <span className="text-secondary" style={{ fontSize: "0.8rem" }}>{meta.desc}</span>
                          </div>

                          {conn.pos_type === "toast" && conn.sftp_username && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
                              <div>
                                <span className="text-secondary">SFTP username: </span>
                                <code style={{ color: "var(--gold)", fontFamily: "monospace" }}>{conn.sftp_username}</code>
                              </div>
                              <div>
                                <span className="text-secondary">SFTP path: </span>
                                <code style={{ color: "var(--gold)", fontFamily: "monospace" }}>{conn.sftp_path}</code>
                              </div>
                              <div className="text-secondary">Enter these credentials in Toast Hub → SFTP Export settings.</div>
                            </div>
                          )}

                          {conn.pos_type === "skytab" && conn.ingest_email && (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem" }}>
                              <div>
                                <span className="text-secondary">Send reports to: </span>
                                <code style={{ color: "var(--gold)", fontFamily: "monospace" }}>{conn.ingest_email}</code>
                              </div>
                              <div className="text-secondary">In SkyTab Lighthouse, subscribe your nightly sales report to this email address.</div>
                            </div>
                          )}

                          {conn.pos_type === "square" && conn.square_merchant_id && (
                            <div style={{ fontSize: "0.85rem" }}>
                              <span className="text-secondary">Merchant ID: </span>
                              <code style={{ color: "var(--gold)", fontFamily: "monospace" }}>{conn.square_merchant_id}</code>
                            </div>
                          )}

                          {conn.last_error && (
                            <div className="alert alert-danger" style={{ marginTop: "0.5rem", fontSize: "0.82rem" }}>
                              Last error: {conn.last_error}
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.6rem", fontSize: "0.8rem" }} className="text-secondary">
                            <span>Last import: {fmtDate(conn.last_import_at)}</span>
                            {conn.pos_type !== "square" && (
                              <span>Files received: {conn.files_received_total ?? 0}</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                          onClick={() => setDeleteId(conn.id)}
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Add new integration */}
          <section>
            <h2 className="section-title" style={{ marginBottom: "1rem" }}>Add a connection</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {(["toast", "skytab", "square"] as const).map((type) => {
                const meta = POS_META[type];
                const already = connectedTypes.has(type);
                return (
                  <div
                    key={type}
                    className="card"
                    style={{ padding: "1.5rem", opacity: already ? 0.5 : 1 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{meta.label}</span>
                    </div>
                    <p className="text-secondary" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
                      {type === "toast" && "Toast exports a nightly CSV to your SFTP credentials. We'll import it automatically each morning."}
                      {type === "skytab" && "SkyTab Lighthouse can email daily reports. Subscribe your report to your unique ingest address."}
                      {type === "square" && "Connect Square with OAuth. We'll pull the previous day's orders each night automatically."}
                    </p>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: "100%", fontSize: "0.85rem" }}
                      disabled={already}
                      onClick={() => {
                        setSetupType(type);
                        setSetupLocationId(locations[0]?.id ?? "");
                        setSetupError(null);
                      }}
                    >
                      {already ? "Already connected" : `Connect ${meta.label}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Setup modal */}
      {setupType && (
        <div className="modal-overlay" onClick={() => setSetupType(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Connect {POS_META[setupType].label}</h3>
              <button type="button" className="modal-close" onClick={() => setSetupType(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {locations.length > 1 && (
                <div>
                  <label className="form-label">Location</label>
                  <select
                    className="form-select"
                    value={setupLocationId}
                    onChange={(e) => setSetupLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {setupType === "toast" && (
                <div className="alert" style={{ fontSize: "0.85rem" }}>
                  We'll generate SFTP credentials for you. Enter them in Toast Hub under{" "}
                  <strong>Back Office → Integrations → SFTP Export</strong>.
                  Toast will push nightly files automatically after closeout.
                </div>
              )}

              {setupType === "skytab" && (
                <div className="alert" style={{ fontSize: "0.85rem" }}>
                  We'll generate a unique email address. In SkyTab Lighthouse, go to{" "}
                  <strong>Reports → Email Subscriptions</strong> and add this address as a recipient
                  for your daily sales report.
                </div>
              )}

              {setupType === "square" && (
                <div className="alert" style={{ fontSize: "0.85rem" }}>
                  You'll be redirected to Square to authorize access. We only request read permissions for orders and items.
                </div>
              )}

              {setupError && (
                <div className="alert alert-danger" style={{ fontSize: "0.85rem" }}>{setupError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSetupType(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSetup()}
                disabled={setupBusy || !setupLocationId}
              >
                {setupBusy ? "Setting up..." : setupType === "square" ? "Authorize with Square" : "Generate credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect confirm */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3>Disconnect integration</h3>
              <button type="button" className="modal-close" onClick={() => setDeleteId(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
                This will remove the connection. Historical import data will be kept, but automatic imports will stop.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleDelete(deleteId)}
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
