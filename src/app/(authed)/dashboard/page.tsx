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

  useEffect(() => {
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

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-soft)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Overview
            </h2>
            <p className="text-sm text-[var(--enterprise-muted)]">
              Variance flags and demand signals for the next two weeks.
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--enterprise-accent-soft)] px-4 py-3 text-sm text-[var(--app-accent-strong)]">
            {loading ? "Syncing variance + forecast..." : "Live from POS runs"}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--enterprise-muted)]">
              Flagged items
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {loading ? "—" : flags.length}
            </p>
            <p className="text-xs text-[var(--enterprise-muted)]">
              Latest variance week{" "}
              {latestVarianceWeek
                ? new Date(latestVarianceWeek).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--enterprise-muted)]">
              Next forecast date
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {nextForecast
                ? new Date(nextForecast.forecast_date).toLocaleDateString()
                : "—"}
            </p>
            <p className="text-xs text-[var(--enterprise-muted)]">
              {nextForecast
                ? `${nextForecast.forecast_usage_oz} oz expected`
                : "No forecast data yet"}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--enterprise-muted)]">
              Forecast rows
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {loading ? "—" : forecast.length}
            </p>
            <p className="text-xs text-[var(--enterprise-muted)]">
              Demand horizon: 14 days
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-soft)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="enterprise-heading text-lg font-semibold">
                Variance flags
              </h3>
              <p className="text-sm text-[var(--enterprise-muted)]">
                Weekly shrink signals across locations.
              </p>
            </div>
            <Link
              href="/variance"
              className="text-xs font-semibold text-[var(--enterprise-accent)]"
            >
              View full variance
            </Link>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-[var(--enterprise-muted)]">
              Loading variance...
            </p>
          ) : flags.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--enterprise-muted)]">
              No variance flags yet.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--enterprise-border)]">
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

        <div className="rounded-3xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-soft)]">
          <h3 className="enterprise-heading text-lg font-semibold">
            Next 14-day forecast
          </h3>
          <p className="text-sm text-[var(--enterprise-muted)]">
            Daily ounces projected by item.
          </p>
          {forecast.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--enterprise-muted)]">
              No forecast data yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
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
    </section>
  );
}
