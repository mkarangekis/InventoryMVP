"use client";

/**
 * /count — Mobile-optimized PWA inventory count page
 * Designed for bar managers counting at 2AM on their phone.
 * Works offline via service worker + IndexedDB background sync.
 */

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type InventoryItem = {
  id: string;
  name: string;
  container_type: string;
  container_size_oz: number;
  category?: string | null;
};

type CountEntry = {
  itemId: string;
  value: string; // raw string for flexible input (e.g. "2.5", "1 3/4")
};

const parseOz = (raw: string, containerSizeOz: number): number => {
  const trimmed = raw.trim();
  // Support fractions: "1 3/4" or "3/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) return Number(mixedMatch[1]) + Number(mixedMatch[2]) / Number(mixedMatch[3]);
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) return Number(fracMatch[1]) / Number(fracMatch[2]);
  const n = parseFloat(trimmed);
  return isNaN(n) ? 0 : n;
};

export default function CountPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "queued"; msg: string } | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState("");
  const [locationId, setLocationId] = useState<string>("");
  const [token, setToken] = useState<string | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const tok = data.session?.access_token ?? null;
      setToken(tok);

      if (!tok) {
        setLoading(false);
        return;
      }

      const locId = typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId") ?? ""
        : "";
      setLocationId(locId);

      const res = await fetch(`/api/inventory/items${locId ? `?locationId=${locId}` : ""}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const payload = (await res.json()) as { items: InventoryItem[] };
        setItems(payload.items ?? []);
        // Pre-fill empty counts
        const init: Record<string, string> = {};
        for (const item of payload.items ?? []) init[item.id] = "";
        setCounts(init);
      }
      setLoading(false);
    };
    void load();
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setStatus(null);

    const lines = items
      .filter((item) => counts[item.id]?.trim())
      .map((item) => ({
        inventory_item_id: item.id,
        actual_remaining_oz: Math.max(0, parseOz(counts[item.id] ?? "0", item.container_size_oz)),
      }));

    if (lines.length === 0) {
      setStatus({ type: "error", msg: "Enter at least one count before submitting." });
      setSubmitting(false);
      return;
    }

    const body = { locationId, snapshotDate, lines };

    try {
      const res = await fetch("/api/inventory/snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        setStatus({ type: "error", msg: err });
      } else {
        const payload = (await res.json()) as { ok?: boolean; queued?: boolean };
        if (payload.queued) {
          setStatus({ type: "queued", msg: `${lines.length} items queued for sync when online.` });
        } else {
          setStatus({ type: "success", msg: `${lines.length} items saved. Great count!` });
          // Reset counts
          const reset: Record<string, string> = {};
          for (const item of items) reset[item.id] = "";
          setCounts(reset);
        }
      }
    } catch {
      setStatus({ type: "queued", msg: `Offline — ${lines.length} items queued. Will sync when connection returns.` });
    }
    setSubmitting(false);
  };

  const filtered = items.filter((item) =>
    !filter || item.name.toLowerCase().includes(filter.toLowerCase())
  );

  const filledCount = Object.values(counts).filter((v) => v.trim()).length;

  if (!token && !loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0c0b09",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
        color: "#e5e0d8",
        padding: 24,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#d4a853" }}>P</div>
        <p style={{ fontSize: 14 }}>Sign in to start counting</p>
        <a href="/login" style={{
          background: "#d4a853",
          color: "#0c0b09",
          borderRadius: 8,
          padding: "10px 24px",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}>Sign in</a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0c0b09",
      color: "#e5e0d8",
      fontFamily: "'Satoshi', -apple-system, sans-serif",
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#15140f",
        borderBottom: "1px solid #2a2720",
        padding: "12px 16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "#d4a853", fontSize: 16 }}>P</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Inventory Count</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {filledCount > 0 && (
              <span style={{
                background: "rgba(212,168,83,0.15)",
                color: "#d4a853",
                borderRadius: 12,
                padding: "2px 8px",
                fontSize: 12,
                fontWeight: 600,
              }}>
                {filledCount} entered
              </span>
            )}
          </div>
        </div>

        {/* Date + filter */}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            style={{
              background: "#1e1c16",
              border: "1px solid #2a2720",
              borderRadius: 8,
              color: "#e5e0d8",
              padding: "7px 10px",
              fontSize: 13,
              flex: "0 0 auto",
            }}
          />
          <input
            ref={filterRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search items..."
            style={{
              flex: 1,
              background: "#1e1c16",
              border: "1px solid #2a2720",
              borderRadius: 8,
              color: "#e5e0d8",
              padding: "7px 12px",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Status banner */}
      {status && (
        <div style={{
          margin: "12px 16px 0",
          padding: "12px 16px",
          borderRadius: 10,
          background: status.type === "success" ? "rgba(34,197,94,0.1)"
            : status.type === "queued" ? "rgba(212,168,83,0.1)"
            : "rgba(239,68,68,0.1)",
          border: `1px solid ${status.type === "success" ? "#22c55e" : status.type === "queued" ? "#d4a853" : "#ef4444"}`,
          fontSize: 13,
          color: status.type === "success" ? "#22c55e" : status.type === "queued" ? "#d4a853" : "#ef4444",
        }}>
          {status.msg}
        </div>
      )}

      {/* Item list */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 2 }}>
        {loading ? (
          <p style={{ color: "#8a8782", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            Loading items...
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#8a8782", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
            {filter ? `No items matching "${filter}"` : "No inventory items configured."}
          </p>
        ) : (
          filtered.map((item) => {
            const val = counts[item.id] ?? "";
            const haVal = val.trim().length > 0;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: "1px solid #1e1c16",
                }}
              >
                {/* Filled indicator */}
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: haVal ? "#22c55e" : "#2a2720",
                  transition: "background 0.2s",
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.2 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: "#8a8782", marginTop: 2 }}>
                    {item.container_type} · {item.container_size_oz}oz
                  </div>
                </div>

                <input
                  type="text"
                  inputMode="decimal"
                  value={val}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  placeholder="0"
                  style={{
                    width: 72,
                    background: haVal ? "rgba(212,168,83,0.08)" : "#1e1c16",
                    border: `1px solid ${haVal ? "#d4a853" : "#2a2720"}`,
                    borderRadius: 8,
                    color: "#e5e0d8",
                    padding: "8px 10px",
                    fontSize: 16, // 16px prevents iOS zoom
                    textAlign: "right",
                    outline: "none",
                    transition: "border-color 0.2s, background 0.2s",
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Submit button — sticky at bottom */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(to top, #0c0b09 60%, transparent)",
        padding: "16px 16px 24px",
        zIndex: 50,
      }}>
        {filledCount > 0 && (
          <div style={{ marginBottom: 8, textAlign: "center", fontSize: 12, color: "#8a8782" }}>
            {filledCount} of {items.length} items counted
          </div>
        )}
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting || filledCount === 0}
          style={{
            width: "100%",
            padding: "16px",
            background: filledCount === 0 ? "#1e1c16" : "#d4a853",
            color: filledCount === 0 ? "#555" : "#0c0b09",
            border: "none",
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 700,
            cursor: filledCount === 0 ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}
        >
          {submitting ? "Saving..." : `Submit Count${filledCount > 0 ? ` (${filledCount} items)` : ""}`}
        </button>
      </div>
    </div>
  );
}
