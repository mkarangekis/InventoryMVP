"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Notification = {
  id: string;
  type: "variance" | "reorder" | "system";
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  location_id?: string | null;
};

const BellIcon = ({ hasBadge }: { hasBadge: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "relative" }}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    {hasBadge && <circle cx="18" cy="6" r="4" fill="#ef4444" stroke="none" />}
  </svg>
);

export function NotificationCenter({ locationId }: { locationId?: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Load notifications from localStorage (simple persistence)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("barops.notifications");
      if (stored) setNotifications(JSON.parse(stored) as Notification[]);
    } catch {}
  }, []);

  const persist = (items: Notification[]) => {
    try {
      // Keep last 50
      const trimmed = items.slice(0, 50);
      localStorage.setItem("barops.notifications", JSON.stringify(trimmed));
      setNotifications(trimmed);
    } catch {}
  };

  const addNotification = (n: Omit<Notification, "id" | "read" | "created_at">) => {
    const next: Notification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => {
      const updated = [next, ...prev];
      persist(updated);
      return updated;
    });
    // Browser push if permission granted
    if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
      try { new window.Notification(n.title, { body: n.body, icon: "/favicon.svg" }); } catch {}
    }
  };

  // Subscribe to Supabase Realtime — only after confirming a valid session
  useEffect(() => {
    let channel: ReturnType<typeof supabaseBrowser.channel> | null = null;

    const init = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session?.access_token) return; // no session — skip subscribe

      channel = supabaseBrowser.channel("notif-variance-flags")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "variance_flags",
            ...(locationId ? { filter: `location_id=eq.${locationId}` } : {}),
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            addNotification({
              type: "variance",
              title: `Variance Alert: ${String(row.item_name ?? "Item")}`,
              body: `Severity: ${String(row.severity ?? "flagged")} — ${String(row.variance_pct ?? "?")}% off expected.`,
              location_id: typeof row.location_id === "string" ? row.location_id : null,
            });
          }
        )
        .subscribe();
    };

    void init();
    return () => { if (channel) void supabaseBrowser.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persist(updated);
  };

  const dismiss = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    persist(updated);
  };

  const requestPush = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    await window.Notification.requestPermission();
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60_000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const typeColor = (type: Notification["type"]) => {
    if (type === "variance") return "#ef4444";
    if (type === "reorder") return "#f59e0b";
    return "var(--enterprise-accent)";
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          background: open ? "var(--app-surface-elevated)" : "transparent",
          border: "1px solid transparent",
          cursor: "pointer",
          color: "var(--enterprise-fg)",
          position: "relative",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--app-surface-elevated)")}
        onMouseLeave={(e) => !open && (e.currentTarget.style.background = "transparent")}
      >
        <BellIcon hasBadge={unreadCount > 0} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 4,
            right: 4,
            minWidth: 14,
            height: 14,
            borderRadius: 7,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            padding: "0 2px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 480,
            background: "var(--app-surface)",
            border: "1px solid var(--enterprise-border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid var(--enterprise-border)",
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--enterprise-fg)" }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", fontSize: 10, borderRadius: 6, padding: "1px 6px" }}>
                  {unreadCount}
                </span>
              )}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  style={{ fontSize: 11, color: "var(--enterprise-accent)", background: "none", border: "none", cursor: "pointer" }}
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={requestPush}
                title="Get instant browser alerts without checking email — works even when this tab isn't focused"
                style={{ fontSize: 11, color: "var(--enterprise-accent)", background: "none", border: "none", cursor: "pointer" }}
              >
                + Push alerts
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--enterprise-muted)", fontSize: 13 }}>
                All clear — no alerts.<br />
                <span style={{ fontSize: 11, lineHeight: 1.6, display: "block", marginTop: 6 }}>
                  When variance flags trigger or orders are ready, they'll show up here instantly — no refresh needed.
                </span>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--enterprise-border)",
                    background: n.read ? "transparent" : "rgba(212,168,83,0.04)",
                    position: "relative",
                  }}
                >
                  <div style={{
                    width: 6,
                    flexShrink: 0,
                    borderRadius: 3,
                    background: n.read ? "transparent" : typeColor(n.type),
                    alignSelf: "stretch",
                    minHeight: 24,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? 400 : 600, fontSize: 12, color: "var(--enterprise-fg)", marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--enterprise-muted)", lineHeight: 1.4 }}>
                      {n.body}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--enterprise-muted)", marginTop: 4 }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(n.id)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--enterprise-muted)", fontSize: 14, lineHeight: 1, alignSelf: "flex-start", padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
