"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";

type VarianceFlag = {
  id: string;
  week_start_date: string;
  item_name: string;
  expected_remaining_oz: string;
  actual_remaining_oz: string;
  variance_oz: string;
  variance_pct: string;
  severity: string;
};

type ForecastRow = {
  forecast_date: string;
  inventory_item_id: string;
  forecast_usage_oz: number;
  location_id: string;
};


export default function DashboardPage() {
  const [flags, setFlags] = useState<VarianceFlag[]>([]);
  const [forecast, setForecast] = useState<ForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const enterpriseEnabled = isEnterpriseUIEnabled();

  const sortedForecast = useMemo(
    () =>
      [...forecast].sort(
        (a, b) =>
          new Date(a.forecast_date).getTime() -
          new Date(b.forecast_date).getTime(),
      ),
    [forecast],
  );
  const nextForecast = sortedForecast[0];
  const latestVarianceWeek = flags[0]?.week_start_date ?? "";

  const load = async () => {
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

    const [varianceRes, forecastRes] = await Promise.all([
      fetch(`/api/variance${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/forecast${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (varianceRes.ok) {
      const payload = (await varianceRes.json()) as { flags: VarianceFlag[] };
      setFlags(payload.flags);
    }
    if (forecastRes.ok) {
      const payload = (await forecastRes.json()) as {
        forecast: ForecastRow[];
      };
      setForecast(payload.forecast);
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();

    const handleLocationChange = () => {
      void load();
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


  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Leak & Variance Dashboard</h1>
        <p className="text-sm text-gray-600">
          Latest variance flags across your locations.
        </p>

        {loading ? (
          <p className="text-sm text-gray-600">Loading variance...</p>
        ) : flags.length === 0 ? (
          <p className="text-sm text-gray-600">No variance flags yet.</p>
        ) : (
          <div className="overflow-hidden rounded border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Week</th>
                  <th className="px-3 py-2">Expected</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Variance</th>
                  <th className="px-3 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.id} className="border-t">
                    <td className="px-3 py-2">{flag.item_name}</td>
                    <td className="px-3 py-2">
                      {new Date(flag.week_start_date).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">{flag.expected_remaining_oz}</td>
                    <td className="px-3 py-2">{flag.actual_remaining_oz}</td>
                    <td className="px-3 py-2">{flag.variance_oz}</td>
                    <td className="px-3 py-2 font-semibold">{flag.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Next 14-day Forecast</h2>
          {forecast.length === 0 ? (
            <p className="text-sm text-gray-600">No forecast data yet.</p>
          ) : (
            <div className="mt-3 grid gap-2 text-sm text-gray-700">
              {forecast.slice(0, 10).map((row) => (
                <div key={`${row.inventory_item_id}-${row.forecast_date}`}>
                  {new Date(row.forecast_date).toLocaleDateString()} -{" "}
                  {row.forecast_usage_oz} oz
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const varianceTotalOz = flags.reduce((sum, flag) => {
    const value = Number.parseFloat(flag.variance_oz);
    return sum + (Number.isNaN(value) ? 0 : Math.abs(value));
  }, 0);
  const trackedItems = new Set(
    forecast.map((row) => row.inventory_item_id),
  ).size;

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Leak & Variance Dashboard
            </h2>
            <p className="app-card-subtitle">
              Latest variance flags across your locations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="btn-secondary btn-sm" href="/variance">
              Export
            </Link>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                setLoading(true);
                void load();
              }}
            >
              {loading ? "Syncing..." : "Sync now"}
            </button>
          </div>
        </div>
        <div className="app-card-body">
          <div className="app-kpi-grid">
            <div className="app-kpi-card">
              <p className="app-kpi-label">Variance This Week</p>
              <p className="app-kpi-value">
                {loading ? "—" : `${varianceTotalOz.toFixed(1)} oz`}
              </p>
              <p className="app-kpi-meta">
                {latestVarianceWeek
                  ? `Week of ${new Date(latestVarianceWeek).toLocaleDateString()}`
                  : "No variance week yet"}
              </p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Active Flags</p>
              <p className="app-kpi-value">{loading ? "—" : flags.length}</p>
              <p className="app-kpi-meta">Awaiting review</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Items Tracked</p>
              <p className="app-kpi-value">
                {loading ? "—" : trackedItems || "—"}
              </p>
              <p className="app-kpi-meta">Forecast coverage</p>
            </div>
            <div className="app-kpi-card">
              <p className="app-kpi-label">Next Forecast</p>
              <p className="app-kpi-value">
                {nextForecast
                  ? new Date(nextForecast.forecast_date).toLocaleDateString()
                  : "—"}
              </p>
              <p className="app-kpi-meta">
                {nextForecast
                  ? `${nextForecast.forecast_usage_oz} oz expected`
                  : "Building forecast"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Variance flags</h3>
              <p className="app-card-subtitle">
                Potential shrink and over-pours to review.
              </p>
            </div>
            <Link className="btn-ghost btn-sm" href="/variance">
              View all
            </Link>
          </div>
          <div className="app-card-body">
            {loading ? (
              <p className="text-sm text-[var(--enterprise-muted)]">
                Loading variance...
              </p>
            ) : flags.length === 0 ? (
              <div className="app-empty">
                <div className="app-empty-title">No Variance Flags Yet</div>
                <p className="app-empty-desc">
                  Once your POS is connected and inventory is tracked, variance
                  flags will appear here showing potential shrinkage and
                  over-pouring.
                </p>
                <div className="app-empty-actions">
                  <Link className="btn-primary btn-sm" href="/ingest">
                    Connect POS
                  </Link>
                  <Link className="btn-secondary btn-sm" href="/inventory">
                    Add Inventory
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--enterprise-border)]">
                <table className="app-table w-full text-left text-sm">
                  <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Week</th>
                      <th className="px-3 py-2">Variance</th>
                      <th className="px-3 py-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.slice(0, 6).map((flag) => (
                      <tr key={flag.id} className="border-t">
                        <td className="px-3 py-2">{flag.item_name}</td>
                        <td className="px-3 py-2">
                          {new Date(flag.week_start_date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{flag.variance_oz}</td>
                        <td className="px-3 py-2 font-semibold">
                          {flag.severity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Next 14-Day Forecast</h3>
              <p className="app-card-subtitle">
                Daily ounces projected by item.
              </p>
            </div>
          </div>
          <div className="app-card-body">
            {forecast.length === 0 ? (
              <div className="app-empty">
                <div className="app-empty-title">Building Your Forecast</div>
                <p className="app-empty-desc">
                  Forecast data will appear once we have enough sales history to
                  generate predictions. Typically requires 2-4 weeks of POS
                  data.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {sortedForecast.slice(0, 8).map((row) => (
                  <div
                    key={`${row.inventory_item_id}-${row.forecast_date}`}
                    className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {new Date(row.forecast_date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold">
                        {row.forecast_usage_oz} oz
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
