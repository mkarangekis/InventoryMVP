"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
import { AiDataGap, AiShiftPush, AiWeeklyBrief } from "@/ai/types";
import { isAiTopPanelEnabled, isGraphsOverviewEnabled } from "@/config/flags";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";

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
  const [shiftPush, setShiftPush] = useState<AiShiftPush | null>(null);
  const [dataGap, setDataGap] = useState<AiDataGap | null>(null);
  const [weeklyBrief, setWeeklyBrief] = useState<AiWeeklyBrief | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState({
    shiftPush: true,
    dataGap: true,
    weeklyBrief: true,
  });
  const enterpriseEnabled = isEnterpriseUIEnabled();
  const aiTopEnabled = isAiTopPanelEnabled();
  const graphsEnabled = isGraphsOverviewEnabled();

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    forecastByDay: { date: string; total_usage_oz: number }[];
    varianceByWeek: {
      week_start_date: string;
      total_abs_variance_oz: number;
      flag_count: number;
    }[];
    topForecastItems: {
      inventory_item_id: string;
      item_name: string;
      total_usage_oz: number;
    }[];
  } | null>(null);

  const [varianceView, setVarianceView] = useState<"charts" | "table">("charts");
  const [forecastView, setForecastView] = useState<"charts" | "table">("charts");

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

  const loadAnalytics = async () => {
    if (!graphsEnabled) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    const { data } = await supabaseBrowser.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setAnalyticsLoading(false);
      return;
    }

    const locationId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("barops.locationId")
        : null;
    const query = locationId ? `?locationId=${locationId}` : "";

    const res = await fetch(`/api/v1/analytics/overview${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      setAnalyticsError(await res.text());
      setAnalytics(null);
      setAnalyticsLoading(false);
      return;
    }

    setAnalytics((await res.json()) as any);
    setAnalyticsLoading(false);
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

    const [shiftRes, gapRes, briefRes] = await Promise.all([
      fetch(`/api/v1/ai/shift-push${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/v1/ai/data-gap${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/v1/ai/weekly-brief${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    if (shiftRes.status === 404) {
      setAiEnabled((prev) => ({ ...prev, shiftPush: false }));
    } else if (shiftRes.ok) {
      setShiftPush((await shiftRes.json()) as AiShiftPush);
    }

    if (gapRes.status === 404) {
      setAiEnabled((prev) => ({ ...prev, dataGap: false }));
    } else if (gapRes.ok) {
      setDataGap((await gapRes.json()) as AiDataGap);
    }

    if (briefRes.status === 404) {
      setAiEnabled((prev) => ({ ...prev, weeklyBrief: false }));
    } else if (briefRes.ok) {
      setWeeklyBrief((await briefRes.json()) as AiWeeklyBrief);
    }

    setAiLoading(false);
  };

  useEffect(() => {
    void load();
    void loadAi();
    void loadAnalytics();

    const handleLocationChange = () => {
      void load();
      void loadAi();
      void loadAnalytics();
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

        <AIInsightsTopPanel
          pageContext="overview"
          loading={aiLoading}
          error={
            !aiEnabled.shiftPush && !aiEnabled.dataGap && !aiEnabled.weeklyBrief
              ? "AI insights are not enabled for this workspace."
              : !shiftPush && !dataGap && !weeklyBrief
                ? "No AI insights available yet."
                : null
          }
          summary={
            weeklyBrief
              ? `Week ${weeklyBrief.week_range}: ${weeklyBrief.wins[0]?.title ?? "Summary ready."}`
              : shiftPush
                ? `Shift push ready: ${shiftPush.push_items.length} items to spotlight.`
                : dataGap
                  ? `Data gap advisor: ${dataGap.gaps.length} opportunities to improve accuracy.`
                  : null
          }
          recommendations={[
            ...(weeklyBrief?.next_actions ?? []).slice(0, 3).map((a) => ({
              action: a.action,
              reason: a.why,
              urgency: "med",
            })),
            ...(dataGap?.gaps ?? []).slice(0, 2).map((g) => ({
              action: g.gap,
              reason: g.expected_improvement,
              urgency: g.priority,
            })),
            ...(shiftPush?.push_items ?? []).slice(0, 2).map((i) => ({
              action: `Spotlight ${i.item}`,
              reason: i.why,
              urgency: i.priority,
            })),
          ]}
          risks={(weeklyBrief?.watchouts ?? []).slice(0, 4).map((w) => ({
            risk: w.title,
            impact: w.detail,
          }))}
        />

        {graphsEnabled ? (
          <div className="rounded border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Overview Charts</h2>
                <p className="text-sm text-gray-600">
                  Interactive rollups from forecasts and variance.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ViewToggle value={varianceView} onChange={setVarianceView} />
                <ViewToggle value={forecastView} onChange={setForecastView} />
              </div>
            </div>

            {analyticsLoading ? (
              <p className="mt-3 text-sm text-gray-600">Loading charts…</p>
            ) : analyticsError ? (
              <p className="mt-3 text-sm text-amber-900">{analyticsError}</p>
            ) : analytics ? (
              <div className="mt-4 grid gap-4">
                {varianceView === "charts" ? (
                  <div>
                    <div className="text-sm font-semibold">Variance over time</div>
                    <div className="mt-2">
                      <LineChart
                        series={[
                          {
                            name: "Abs variance (oz)",
                            color: "#d4a853",
                            data: (analytics.varianceByWeek ?? []).map((row) => ({
                              x: new Date(row.week_start_date).getTime(),
                              y: row.total_abs_variance_oz,
                              label: new Date(row.week_start_date).toLocaleDateString(),
                            })),
                          },
                        ]}
                        valueFormat={(v) => `${v.toFixed(1)} oz`}
                      />
                    </div>
                  </div>
                ) : null}

                {forecastView === "charts" ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-sm font-semibold">Forecast usage (total)</div>
                      <div className="mt-2">
                        <LineChart
                          series={[
                            {
                              name: "Forecast usage (oz)",
                              color: "#d4a853",
                              data: (analytics.forecastByDay ?? []).map((row) => ({
                                x: new Date(row.date).getTime(),
                                y: row.total_usage_oz,
                                label: new Date(row.date).toLocaleDateString(),
                              })),
                            },
                          ]}
                          valueFormat={(v) => `${v.toFixed(0)} oz`}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Top items by forecast usage</div>
                      <div className="mt-2">
                        <BarChart
                          data={(analytics.topForecastItems ?? []).map((row) => ({
                            label: row.item_name,
                            value: row.total_usage_oz,
                            color: "#d4a853",
                          }))}
                          valueFormat={(v) => `${v.toFixed(0)} oz`}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                {varianceView === "table" || forecastView === "table" ? (
                  <p className="text-sm text-gray-600">
                    Switch the page sections below to table view.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No chart data yet.</p>
            )}
          </div>
        ) : null}

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

      <AIInsightsTopPanel
        pageContext="overview"
        loading={aiLoading}
        error={
          !aiEnabled.shiftPush && !aiEnabled.dataGap && !aiEnabled.weeklyBrief
            ? "AI insights are not enabled for this workspace."
            : !shiftPush && !dataGap && !weeklyBrief
              ? "No AI insights available yet."
              : null
        }
        primaryMetrics={[
          {
            label: "Variance this week",
            value: loading ? "—" : `${varianceTotalOz.toFixed(1)} oz`,
            meta: latestVarianceWeek
              ? `Week of ${new Date(latestVarianceWeek).toLocaleDateString()}`
              : "No variance week yet",
          },
          {
            label: "Active flags",
            value: loading ? "—" : String(flags.length),
            meta: "Awaiting review",
          },
          {
            label: "Items tracked",
            value: loading ? "—" : trackedItems ? String(trackedItems) : "—",
            meta: "Forecast coverage",
          },
        ]}
        summary={
          weeklyBrief
            ? `Week ${weeklyBrief.week_range}: ${weeklyBrief.wins[0]?.title ?? "Summary ready."}`
            : shiftPush
              ? `Shift push ready: ${shiftPush.push_items.length} items to spotlight.`
              : dataGap
                ? `Data gap advisor: ${dataGap.gaps.length} opportunities to improve accuracy.`
                : null
        }
        recommendations={[
          ...(weeklyBrief?.next_actions ?? []).slice(0, 3).map((a) => ({
            action: a.action,
            reason: a.why,
            urgency: "med",
          })),
          ...(dataGap?.gaps ?? []).slice(0, 2).map((g) => ({
            action: g.gap,
            reason: g.expected_improvement,
            urgency: g.priority,
          })),
          ...(shiftPush?.push_items ?? []).slice(0, 2).map((i) => ({
            action: `Spotlight ${i.item}`,
            reason: i.why,
            urgency: i.priority,
          })),
        ]}
        risks={(weeklyBrief?.watchouts ?? []).slice(0, 4).map((w) => ({
          risk: w.title,
          impact: w.detail,
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Variance flags</h3>
              <p className="app-card-subtitle">
                Potential shrink and over-pours to review.
              </p>
            </div>
            {graphsEnabled ? (
              <ViewToggle value={varianceView} onChange={setVarianceView} />
            ) : (
            <Link className="btn-ghost btn-sm" href="/variance">
              View all
            </Link>
            )}
          </div>
          <div className="app-card-body">
            {graphsEnabled && varianceView === "charts" ? (
              analyticsLoading ? (
                <p className="text-sm text-[var(--enterprise-muted)]">
                  Loading variance chart…
                </p>
              ) : analyticsError ? (
                <p className="text-sm text-[var(--enterprise-muted)]">
                  {analyticsError}
                </p>
              ) : analytics?.varianceByWeek?.length ? (
                <LineChart
                  series={[
                    {
                      name: "Abs variance (oz)",
                      color: "var(--enterprise-accent)",
                      data: analytics.varianceByWeek.map((row) => ({
                        x: new Date(row.week_start_date).getTime(),
                        y: row.total_abs_variance_oz,
                        label: new Date(row.week_start_date).toLocaleDateString(),
                      })),
                    },
                  ]}
                  valueFormat={(v) => `${v.toFixed(1)} oz`}
                />
              ) : (
                <div className="app-empty">
                  <div className="app-empty-title">No Variance Trend Yet</div>
                  <p className="app-empty-desc">
                    Once inventory counts and usage data are available, variance trends will appear here.
                  </p>
                </div>
              )
            ) : loading ? (
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
            {graphsEnabled ? (
              <ViewToggle value={forecastView} onChange={setForecastView} />
            ) : null}
          </div>
          <div className="app-card-body">
            {graphsEnabled && forecastView === "charts" ? (
              analyticsLoading ? (
                <p className="text-sm text-[var(--enterprise-muted)]">
                  Loading forecast chart…
                </p>
              ) : analyticsError ? (
                <p className="text-sm text-[var(--enterprise-muted)]">
                  {analyticsError}
                </p>
              ) : analytics?.forecastByDay?.length ? (
                <div className="space-y-4">
                  <LineChart
                    series={[
                      {
                        name: "Forecast usage (oz)",
                        color: "var(--enterprise-accent)",
                        data: analytics.forecastByDay.map((row) => ({
                          x: new Date(row.date).getTime(),
                          y: row.total_usage_oz,
                          label: new Date(row.date).toLocaleDateString(),
                        })),
                      },
                    ]}
                    valueFormat={(v) => `${v.toFixed(0)} oz`}
                  />
                  {analytics.topForecastItems?.length ? (
                    <BarChart
                      data={analytics.topForecastItems.map((row) => ({
                        label: row.item_name,
                        value: row.total_usage_oz,
                        color: "var(--enterprise-accent)",
                      }))}
                      valueFormat={(v) => `${v.toFixed(0)} oz`}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="app-empty">
                  <div className="app-empty-title">Building Your Forecast</div>
                  <p className="app-empty-desc">
                    Forecast charts will appear once there is enough sales history.
                  </p>
                </div>
              )
            ) : forecast.length === 0 ? (
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

      {!aiTopEnabled &&
        (aiEnabled.shiftPush || aiEnabled.dataGap || aiEnabled.weeklyBrief) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {aiEnabled.shiftPush ? (
            <AiCard
              title="Tonight’s Push"
              subtitle="Suggested items to spotlight this shift."
              loading={aiLoading}
              error={!shiftPush ? "No shift push suggestions yet." : null}
            >
              <div className="space-y-3">
                {shiftPush?.push_items.map((item) => (
                  <div
                    key={`${item.item}-${item.priority}`}
                    className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{item.item}</div>
                      <span className="app-pill">{item.priority}</span>
                    </div>
                    <p className="text-xs text-[var(--enterprise-muted)]">
                      {item.why}
                    </p>
                    <p className="mt-2 text-sm">{item.script}</p>
                  </div>
                ))}
              </div>
            </AiCard>
          ) : null}

          {aiEnabled.dataGap ? (
            <AiCard
              title="Data Gap Advisor"
              subtitle="What to capture next for better accuracy."
              loading={aiLoading}
              error={!dataGap ? "No data gap insights available yet." : null}
            >
              <div className="space-y-3">
                {dataGap?.gaps.map((gap) => (
                  <div
                    key={`${gap.gap}-${gap.priority}`}
                    className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{gap.gap}</div>
                      <span className="app-pill">{gap.priority}</span>
                    </div>
                    <p className="text-xs text-[var(--enterprise-muted)]">
                      {gap.why_it_matters}
                    </p>
                    <p className="mt-2 text-sm">{gap.how_to_collect}</p>
                  </div>
                ))}
              </div>
            </AiCard>
          ) : null}

          {aiEnabled.weeklyBrief ? (
            <AiCard
              title="Weekly Owner Brief"
              subtitle={weeklyBrief?.week_range ?? "Weekly summary"}
              loading={aiLoading}
              error={!weeklyBrief ? "Weekly brief not ready yet." : null}
            >
              <div className="space-y-4 text-sm">
                {weeklyBrief?.wins.length ? (
                  <div>
                    <div className="font-semibold">Wins</div>
                    <ul className="mt-2 space-y-2 text-[var(--enterprise-muted)]">
                      {weeklyBrief.wins.map((win) => (
                        <li key={win.title}>
                          <span className="font-semibold text-[var(--enterprise-ink)]">
                            {win.title}
                          </span>{" "}
                          — {win.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {weeklyBrief?.watchouts.length ? (
                  <div>
                    <div className="font-semibold">Watchouts</div>
                    <ul className="mt-2 space-y-2 text-[var(--enterprise-muted)]">
                      {weeklyBrief.watchouts.map((item) => (
                        <li key={item.title}>
                          <span className="font-semibold text-[var(--enterprise-ink)]">
                            {item.title}
                          </span>{" "}
                          — {item.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {weeklyBrief?.next_actions.length ? (
                  <div>
                    <div className="font-semibold">Next actions</div>
                    <ul className="mt-2 space-y-2 text-[var(--enterprise-muted)]">
                      {weeklyBrief.next_actions.map((action) => (
                        <li key={action.action}>
                          <span className="font-semibold text-[var(--enterprise-ink)]">
                            {action.action}
                          </span>{" "}
                          — {action.why}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </AiCard>
          ) : null}
        </div>
      )}
    </section>
  );
}
