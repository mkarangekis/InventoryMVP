"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AiCountSchedule } from "@/ai/types";

type InventoryItem = {
  id: string;
  location_id: string;
  name: string;
  container_type: string;
  container_size_oz: number;
};

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [bulkValue, setBulkValue] = useState("");
  const [aiSchedule, setAiSchedule] = useState<AiCountSchedule | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const enterpriseEnabled = isEnterpriseUIEnabled();

  const loadItems = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/inventory/items${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const payload = (await response.json()) as { items: InventoryItem[] };
      setItems(payload.items);
    }

    setLoading(false);
  };

  const loadAi = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setAiLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const response = await fetch(`/api/v1/ai/count-schedule${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      setAiEnabled(false);
      setAiLoading(false);
      return;
    }

    if (response.ok) {
      setAiSchedule((await response.json()) as AiCountSchedule);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    void loadItems();
    void loadAi();

    const handleLocationChange = () => {
      void loadItems();
      void loadAi();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("location-change", handleLocationChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("location-change", handleLocationChange);
      }
    };
  }, []);

  const setAllCounts = (value: string) => {
    const next: Record<string, string> = {};
    items.forEach((item) => {
      next[item.id] = value;
    });
    setCounts(next);
  };

  const prefillEmptyWithFull = () => {
    setCounts((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = String(item.container_size_oz ?? 0);
        }
      });
      return next;
    });
  };

  const applyBulkValue = () => {
    if (!bulkValue.trim()) {
      return;
    }
    setAllCounts(bulkValue);
  };

  const handleSubmit = async () => {
    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setStatus("Not signed in");
      return;
    }

    if (items.length === 0) {
      setStatus("No inventory items found");
      return;
    }

    const locationId = items[0].location_id;
    const lines = items.map((item) => ({
      inventoryItemId: item.id,
      actualRemainingOz: Number.parseFloat(counts[item.id] ?? "0") || 0,
    }));

    const response = await fetch("/api/inventory/snapshot", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ locationId, snapshotDate, lines }),
    });

    if (!response.ok) {
      const message = await response.text();
      setStatus(`Error: ${message}`);
      return;
    }

    setStatus("Snapshot saved");
  };

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Inventory Health & Quick Count</h1>
        <p className="text-sm text-gray-600">
          Enter actual remaining ounces for each item.
        </p>

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">
            Snapshot date
            <input
              className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
              type="date"
              value={snapshotDate}
              onChange={(event) => setSnapshotDate(event.target.value)}
            />
          </label>
          <button
            className="rounded bg-black px-3 py-2 text-xs font-semibold text-white"
            onClick={handleSubmit}
          >
            Save snapshot
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <button
            className="rounded border border-gray-300 px-2 py-1"
            onClick={prefillEmptyWithFull}
          >
            Prefill empty = full
          </button>
          <button
            className="rounded border border-gray-300 px-2 py-1"
            onClick={() =>
              setAllCounts(String(items[0]?.container_size_oz ?? 0))
            }
          >
            Set all = full
          </button>
          <button
            className="rounded border border-gray-300 px-2 py-1"
            onClick={() => setAllCounts("0")}
          >
            Set all = 0
          </button>
          <label className="flex items-center gap-2">
            <span>Set all to</span>
            <input
              className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
              type="number"
              step="0.1"
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
            />
            <button
              className="rounded border border-gray-300 px-2 py-1"
              onClick={applyBulkValue}
            >
              Apply
            </button>
          </label>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading inventory...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-600">No inventory items found.</p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Container</th>
                  <th className="px-3 py-2">Remaining (oz)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.name}</td>
                    <td className="px-3 py-2">
                      {item.container_type} ({item.container_size_oz} oz)
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        value={counts[item.id] ?? ""}
                        placeholder={String(item.container_size_oz)}
                        onChange={(event) =>
                          setCounts((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              Inventory Health
            </h2>
            <p className="app-card-subtitle">
              Capture actual ounces to keep forecasts and ordering accurate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="text-xs text-[var(--enterprise-muted)]">
              Snapshot date
              <input
                className="ml-2 rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm"
                type="date"
                value={snapshotDate}
                onChange={(event) => setSnapshotDate(event.target.value)}
              />
            </label>
            <button className="btn-primary btn-sm" onClick={handleSubmit}>
              Save snapshot
            </button>
          </div>
        </div>
        <div className="app-card-body">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--enterprise-muted)]">
            <button
              className="btn-secondary btn-sm"
              onClick={prefillEmptyWithFull}
            >
              Prefill empty = full
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() =>
                setAllCounts(String(items[0]?.container_size_oz ?? 0))
              }
            >
              Set all = full
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => setAllCounts("0")}
            >
              Set all = 0
            </button>
            <label className="flex items-center gap-2">
              <span>Set all to</span>
              <input
                className="w-24 rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-xs text-[var(--enterprise-ink)]"
                type="number"
                step="0.1"
                value={bulkValue}
                onChange={(event) => setBulkValue(event.target.value)}
              />
              <button className="btn-ghost btn-sm" onClick={applyBulkValue}>
                Apply
              </button>
            </label>
          </div>
        </div>
      </div>

      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h3 className="app-card-title">Quick Count</h3>
            <p className="app-card-subtitle">
              Record remaining ounces for each item.
            </p>
          </div>
        </div>
        <div className="app-card-body">
          {loading ? (
            <p className="text-sm text-[var(--enterprise-muted)]">
              Loading inventory...
            </p>
          ) : items.length === 0 ? (
            <div className="app-empty">
              <div className="app-empty-title">No Inventory Items Yet</div>
              <p className="app-empty-desc">
                Start building your inventory by importing from your POS data or
                uploading a CSV.
              </p>
              <div className="app-empty-actions">
                <Link className="btn-primary btn-sm" href="/ingest">
                  Import from POS
                </Link>
                <Link className="btn-secondary btn-sm" href="/ingest">
                  Upload CSV
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--enterprise-border)]">
              <table className="app-table w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Container</th>
                    <th className="px-3 py-2">Remaining (oz)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">
                        {item.container_type} ({item.container_size_oz} oz)
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="w-24 rounded border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-2 py-1 text-sm text-[var(--enterprise-ink)]"
                          value={counts[item.id] ?? ""}
                          placeholder={String(item.container_size_oz)}
                          onChange={(event) =>
                            setCounts((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {status ? (
            <p className="mt-3 text-sm text-[var(--enterprise-muted)]">
              {status}
            </p>
          ) : null}
        </div>
      </div>

      {aiEnabled ? (
        <AiCard
          title="Smart Count Scheduler"
          subtitle="Recommended cadence based on recent variance."
          loading={aiLoading}
          error={!aiSchedule ? "Count schedule not available yet." : null}
        >
          <div className="space-y-3 text-sm">
            {aiSchedule?.cadence.map((item) => (
              <div
                key={`${item.item}-${item.recommended_frequency}`}
                className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{item.item}</div>
                  <span className="app-pill">{item.recommended_frequency}</span>
                </div>
                <p className="text-xs text-[var(--enterprise-muted)]">
                  Variance score: {item.variance_score}
                </p>
                <p className="mt-2 text-sm">{item.why}</p>
              </div>
            ))}
          </div>
        </AiCard>
      ) : null}
    </section>
  );
}
