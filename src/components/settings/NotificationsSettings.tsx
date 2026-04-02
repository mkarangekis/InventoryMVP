"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type NotifPrefs = {
  variance_alerts: boolean;
  reorder_alerts: boolean;
  weekly_digest: boolean;
  digest_day: "monday" | "sunday";
  alert_threshold: "high" | "med" | "all";
};

const DEFAULT_PREFS: NotifPrefs = {
  variance_alerts: true,
  reorder_alerts: true,
  weekly_digest: true,
  digest_day: "monday",
  alert_threshold: "high",
};

const STORAGE_KEY = "barops.notif_prefs";

const getToken = async () => {
  const { data } = await supabaseBrowser.auth.getSession();
  return data.session?.access_token ?? null;
};

export function NotificationsSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [pushPermission, setPushPermission] = useState<string>("default");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fast path: restore from localStorage immediately
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored) as NotifPrefs);
    } catch {}

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(window.Notification.permission);
    }

    // Then hydrate from server (authoritative)
    const loadServer = async () => {
      const tok = await getToken();
      if (!tok) return;
      const res = await fetch("/api/v1/user/notification-prefs", {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return;
      const payload = (await res.json()) as { prefs: NotifPrefs | null };
      if (payload.prefs) {
        setPrefs(payload.prefs);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.prefs)); } catch {}
      }
    };
    void loadServer();
  }, []);

  const save = async () => {
    setSaving(true);
    // Write to localStorage first for instant feedback
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}

    // Then persist to server
    const tok = await getToken();
    if (tok) {
      await fetch("/api/v1/user/notification-prefs", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify(prefs),
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const requestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPushPermission(result);
  };

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pushDenied = pushPermission === "denied";
  const pushGranted = pushPermission === "granted";

  const Row = ({ label, desc, field }: { label: string; desc: string; field: keyof NotifPrefs }) => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid var(--enterprise-border)",
    }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--enterprise-fg)" }}>{label}</p>
        <p style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => toggle(field)}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: prefs[field] ? "var(--enterprise-accent)" : "var(--enterprise-border)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute",
          top: 2,
          left: prefs[field] ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
        }} />
      </button>
    </div>
  );

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">Notification Preferences</h3>
          <p className="app-card-subtitle">
            Control which alerts you receive via email and browser push. Synced to your account.
          </p>
        </div>
      </div>
      <div className="app-card-body">
        {/* Push notifications */}
        <div style={{
          background: pushGranted ? "rgba(34,197,94,0.06)" : pushDenied ? "rgba(239,68,68,0.05)" : "rgba(212,168,83,0.06)",
          border: `1px solid ${pushGranted ? "rgba(34,197,94,0.2)" : pushDenied ? "rgba(239,68,68,0.2)" : "rgba(212,168,83,0.2)"}`,
          borderRadius: 8,
          padding: "12px 14px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--enterprise-fg)" }}>
              Browser Push Notifications
            </p>
            <p style={{ fontSize: 12, color: pushGranted ? "#22c55e" : pushDenied ? "#ef4444" : "var(--enterprise-muted)" }}>
              {pushGranted
                ? "Active — you'll get instant alerts when variance flags are triggered mid-shift."
                : pushDenied
                ? "Blocked — open your browser site settings and allow notifications for this site to re-enable."
                : "Not yet enabled — click to get instant in-browser alerts without checking your email."}
            </p>
          </div>
          {!pushGranted && !pushDenied && (
            <button
              type="button"
              onClick={() => void requestPush()}
              className="btn-primary btn-sm"
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
            >
              Turn on
            </button>
          )}
        </div>

        <Row
          label="Variance Alerts"
          desc="Email when an item exceeds your alert threshold"
          field="variance_alerts"
        />
        <Row
          label="Reorder Alerts"
          desc="Email when purchase orders are auto-generated"
          field="reorder_alerts"
        />
        <Row
          label="Weekly Digest"
          desc="Monday morning summary: variance, revenue, AI recommendations"
          field="weekly_digest"
        />

        <div style={{ padding: "12px 0", borderBottom: "1px solid var(--enterprise-border)" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--enterprise-fg)", marginBottom: 4 }}>Alert threshold</p>
          <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginBottom: 8 }}>
            Only send variance emails when severity meets this bar
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {(["high", "med", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, alert_threshold: t }))}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: prefs.alert_threshold === t ? "var(--enterprise-accent)" : "var(--enterprise-border)",
                  background: prefs.alert_threshold === t ? "rgba(212,168,83,0.12)" : "transparent",
                  color: prefs.alert_threshold === t ? "var(--enterprise-accent)" : "var(--enterprise-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {t === "all" ? "All flags" : t === "high" ? "High only" : "Med + High"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 0" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--enterprise-fg)", marginBottom: 4 }}>Digest day</p>
          <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginBottom: 8 }}>
            Which day to receive your weekly performance email
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {(["monday", "sunday"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, digest_day: d }))}
                style={{
                  padding: "4px 12px",
                  borderRadius: 6,
                  border: "1px solid",
                  borderColor: prefs.digest_day === d ? "var(--enterprise-accent)" : "var(--enterprise-border)",
                  background: prefs.digest_day === d ? "rgba(212,168,83,0.12)" : "transparent",
                  color: prefs.digest_day === d ? "var(--enterprise-accent)" : "var(--enterprise-muted)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {d === "monday" ? "Monday" : "Sunday"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 8 }}>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="btn-primary btn-sm"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
          {saved && (
            <span style={{ fontSize: 12, color: "#22c55e" }}>Saved to your account ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
