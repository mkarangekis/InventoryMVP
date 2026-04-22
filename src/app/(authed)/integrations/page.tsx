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

const POS_LABELS: Record<string, string> = { toast: "Toast", skytab: "SkyTab", square: "Square" };
const POS_SUBTITLES: Record<string, string> = { toast: "Nightly SFTP export", skytab: "Email report ingest", square: "Live API sync" };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; badge: string; dot: string }> = {
    active: { label: "Connected", badge: "app-badge app-badge-green", dot: "status-dot status-dot-success" },
    pending: { label: "Setup pending", badge: "app-badge app-badge-gold", dot: "status-dot status-dot-warning" },
    error: { label: "Error", badge: "app-badge app-badge-red", dot: "status-dot status-dot-danger" },
    disconnected: { label: "Disconnected", badge: "app-badge app-badge-muted", dot: "status-dot" },
  };
  const s = map[status] ?? map.disconnected;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span className={s.dot} />
      <span className={s.badge}>{s.label}</span>
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost btn-sm"
      style={{ padding: "0 6px", height: 24, fontSize: 11, color: copied ? "#22c55e" : "#8b949e" }}
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #1f2732" }}>
      <span style={{ fontSize: 12, color: "#8b949e", width: 120, flexShrink: 0 }}>{label}</span>
      <code style={{ fontSize: 12, color: "#d4a853", fontFamily: "var(--font-family-mono)", flex: 1 }}>{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "Never";

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<PosConnection[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Setup wizard state
  const [setupType, setSetupType] = useState<"toast" | "skytab" | "square" | null>(null);
  const [setupLocationId, setSetupLocationId] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Disconnect confirm state
  const [confirmDisconnect, setConfirmDisconnect] = useState<PosConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => { void load(); }, []);

  const load = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const tok = data.session?.access_token ?? null;
    setToken(tok);
    if (!tok) { setLoading(false); return; }

    const [connRes, locRes] = await Promise.all([
      fetch("/api/integrations/pos", { headers: { Authorization: `Bearer ${tok}` } }),
      fetch("/api/locations", { headers: { Authorization: `Bearer ${tok}` } }),
    ]);

    if (connRes.ok) setConnections(((await connRes.json()) as { connections: PosConnection[] }).connections ?? []);
    if (locRes.ok) {
      const locs: Location[] = ((await locRes.json()) as { locations: Location[] }).locations ?? [];
      setLocations(locs);
      const stored = typeof window !== "undefined" ? window.localStorage.getItem("barops.locationId") : null;
      setSetupLocationId(stored && locs.some((l) => l.id === stored) ? stored : (locs[0]?.id ?? ""));
    }
    setLoading(false);
  };

  const handleSetup = async () => {
    if (!setupType || !setupLocationId || !token) return;
    if (setupType === "square") {
      window.location.href = `/api/integrations/square/connect?locationId=${setupLocationId}`;
      return;
    }
    setSetupBusy(true);
    setSetupError(null);
    const res = await fetch("/api/integrations/pos", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: setupLocationId, posType: setupType }),
    });
    if (!res.ok) { setSetupError(await res.text()); setSetupBusy(false); return; }
    setSetupType(null);
    setSetupBusy(false);
    await load();
  };

  const handleDisconnect = async () => {
    if (!confirmDisconnect || !token) return;
    setDisconnecting(true);
    await fetch(`/api/integrations/pos/${confirmDisconnect.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    setConfirmDisconnect(null);
    setDisconnecting(false);
    await load();
  };

  const connectedTypes = new Set(connections.map((c) => c.pos_type));
  const activeCount = connections.filter((c) => c.status === "active").length;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div>
          <div className="page-header-eyebrow">Configuration</div>
          <h1 className="page-header-title">POS Integrations</h1>
          <p className="page-header-subtitle">
            Connect your point-of-sale system so sales data imports automatically every night — no manual CSV uploads needed.
          </p>
        </div>
        {activeCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span className="status-dot status-dot-success" />
            <span style={{ fontSize: 13, color: "#9ca3af" }}>
              {activeCount} active {activeCount === 1 ? "connection" : "connections"}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: "3rem 0", fontSize: 14 }}>
          Loading connections...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* ── Active connections ── */}
          {connections.length > 0 && (
            <section>
              <div className="text-overline" style={{ marginBottom: "0.75rem" }}>Active connections</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {connections.map((conn) => (
                  <div key={conn.id} className="app-card">
                    <div className="app-card-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="app-card-title">{POS_LABELS[conn.pos_type]}</span>
                          <StatusBadge status={conn.status} />
                          <span style={{ fontSize: 12, color: "#8b949e" }}>{POS_SUBTITLES[conn.pos_type]}</span>
                        </div>
                        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#8b949e", marginTop: 2 }}>
                          <span>Last import: <span style={{ color: "#e5e7eb" }}>{fmtDate(conn.last_import_at)}</span></span>
                          {conn.pos_type !== "square" && (
                            <span>Files received: <span style={{ color: "#e5e7eb" }}>{conn.files_received_total ?? 0}</span></span>
                          )}
                          {conn.last_file_received_at && conn.pos_type !== "square" && (
                            <span>Last file: <span style={{ color: "#e5e7eb" }}>{fmtDate(conn.last_file_received_at)}</span></span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => setConfirmDisconnect(conn)}
                      >
                        Disconnect
                      </button>
                    </div>

                    <div className="app-card-body">
                      {conn.last_error && (
                        <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, fontSize: 12, color: "#ef4444" }}>
                          ⚠ {conn.last_error}
                        </div>
                      )}

                      {conn.pos_type === "toast" && conn.sftp_username && (
                        <div>
                          <div className="text-overline" style={{ marginBottom: 8 }}>SFTP credentials — enter these in Toast Hub → Back Office → Integrations → SFTP Export</div>
                          <CredRow label="SFTP Username" value={conn.sftp_username} />
                          <CredRow label="SFTP Path" value={conn.sftp_path ?? `/uploads/${conn.sftp_username}/`} />
                          <div style={{ marginTop: 10, fontSize: 12, color: "#8b949e" }}>
                            Toast will push <code style={{ color: "#d4a853" }}>OrderDetails.csv</code> and <code style={{ color: "#d4a853" }}>ItemSelectionDetails.csv</code> to this path nightly after closeout.
                          </div>
                        </div>
                      )}

                      {conn.pos_type === "skytab" && conn.ingest_email && (
                        <div>
                          <div className="text-overline" style={{ marginBottom: 8 }}>Ingest email — subscribe this address in SkyTab Lighthouse → Reports → Email Subscriptions</div>
                          <CredRow label="Send reports to" value={conn.ingest_email} />
                          <div style={{ marginTop: 10, fontSize: 12, color: "#8b949e" }}>
                            SkyTab will email the daily sales CSV to this address. We process it automatically on arrival.
                          </div>
                        </div>
                      )}

                      {conn.pos_type === "square" && (
                        <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
                          {conn.square_merchant_id && (
                            <div>
                              <span style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Merchant ID</span>
                              <div style={{ color: "#d4a853", fontFamily: "var(--font-family-mono)", fontSize: 12, marginTop: 2 }}>{conn.square_merchant_id}</div>
                            </div>
                          )}
                          {conn.square_location_id && (
                            <div>
                              <span style={{ fontSize: 11, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Square Location</span>
                              <div style={{ color: "#d4a853", fontFamily: "var(--font-family-mono)", fontSize: 12, marginTop: 2 }}>{conn.square_location_id}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Add a connection ── */}
          <section>
            <div className="text-overline" style={{ marginBottom: "0.75rem" }}>
              {connections.length === 0 ? "Connect your POS" : "Add another connection"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {(["toast", "skytab", "square"] as const).map((type) => {
                const already = connectedTypes.has(type);
                const dots: Record<string, string> = { toast: "#e8572a", skytab: "#0a7abf", square: "#3e9142" };
                const descriptions: Record<string, string> = {
                  toast: "Toast pushes a nightly CSV to SFTP after close. We'll generate credentials — paste them into Toast Hub and you're done.",
                  skytab: "SkyTab Lighthouse can email daily reports. We generate a unique ingest address — add it as a report subscriber.",
                  square: "Connect Square via OAuth. We only request order and item read access, and pull yesterday's sales each night.",
                };
                return (
                  <div
                    key={type}
                    className="app-card"
                    style={{ opacity: already ? 0.45 : 1, transition: "opacity 150ms" }}
                  >
                    <div className="app-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dots[type], flexShrink: 0, boxShadow: `0 0 8px ${dots[type]}60` }} />
                        <span className="app-card-title">{POS_LABELS[type]}</span>
                        {already && <span className="app-badge app-badge-muted">Connected</span>}
                      </div>
                      <div className="app-card-subtitle">{POS_SUBTITLES[type]}</div>
                    </div>
                    <div className="app-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: 0 }}>
                        {descriptions[type]}
                      </p>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={already}
                        onClick={() => { setSetupType(type); setSetupError(null); }}
                        style={{ width: "100%" }}
                      >
                        {already ? "Already connected" : type === "square" ? "Connect with Square" : `Set up ${POS_LABELS[type]}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── What's needed note ── */}
          {connections.length === 0 && (
            <div className="app-card" style={{ borderStyle: "dashed" }}>
              <div className="app-card-body">
                <div className="text-overline" style={{ marginBottom: 8 }}>Before going live</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                  {[
                    { label: "Toast", steps: ["Set TOAST_WEBHOOK_SECRET env var", "Deploy the SFTP server (scripts/sftp-server/) to a VPS", "Configure SFTP_PORT, VERCEL_URL, HOST_KEY_PATH on the VPS"] },
                    { label: "SkyTab", steps: ["Set POSTMARK_INBOUND_HASH env var", "Set INGEST_EMAIL_DOMAIN env var", "Configure Postmark Inbound Webhook → your domain → /api/ingest/email"] },
                    { label: "Square", steps: ["Set SQUARE_APP_ID and SQUARE_APP_SECRET env vars", "Set SQUARE_ENVIRONMENT (sandbox or production)", "Add callback URL to Square Developer app"] },
                  ].map((pos) => (
                    <div key={pos.label}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#f8fafc", marginBottom: 6 }}>{pos.label}</div>
                      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                        {pos.steps.map((step) => (
                          <li key={step} style={{ fontSize: 12, color: "#9ca3af", display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <span style={{ color: "#d4a853", flexShrink: 0, marginTop: 1 }}>→</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Setup modal ── */}
      {setupType && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => !setupBusy && setSetupType(null)}
        >
          <div
            style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 14, width: "100%", maxWidth: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #2a3240" }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc" }}>
                Set up {POS_LABELS[setupType]}
              </span>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => !setupBusy && setSetupType(null)}
                style={{ padding: "0 8px", fontSize: 16, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {locations.length > 1 && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Location
                  </label>
                  <select
                    className="select"
                    value={setupLocationId}
                    onChange={(e) => setSetupLocationId(e.target.value)}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ background: "#0d131a", border: "1px solid #2a3240", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
                {setupType === "toast" && <>
                  We&apos;ll generate unique SFTP credentials for this location. Copy them into <strong style={{ color: "#f8fafc" }}>Toast Hub → Back Office → Integrations → SFTP Export</strong>. Toast will push nightly files automatically after closeout.
                </>}
                {setupType === "skytab" && <>
                  We&apos;ll generate a unique ingest email address. In <strong style={{ color: "#f8fafc" }}>SkyTab Lighthouse → Reports → Email Subscriptions</strong>, add this address as a recipient for your daily sales report.
                </>}
                {setupType === "square" && <>
                  You&apos;ll be redirected to Square to authorize access. We request <strong style={{ color: "#f8fafc" }}>read-only</strong> permissions for orders and items — no write access.
                </>}
              </div>

              {setupError && (
                <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 6, fontSize: 13, color: "#ef4444" }}>
                  {setupError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #2a3240" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSetupType(null)} disabled={setupBusy}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => void handleSetup()}
                disabled={setupBusy || !setupLocationId}
              >
                {setupBusy ? "Setting up..." : setupType === "square" ? "Authorize with Square →" : "Generate credentials"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Disconnect confirm modal ── */}
      {confirmDisconnect && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => !disconnecting && setConfirmDisconnect(null)}
        >
          <div
            style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #2a3240" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc", marginBottom: 4 }}>
                Disconnect {POS_LABELS[confirmDisconnect.pos_type]}?
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>
                Automatic imports will stop. Historical data already imported stays in your account.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px" }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setConfirmDisconnect(null)} disabled={disconnecting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
