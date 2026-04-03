"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
import { AskYourData } from "@/components/ai/AskYourData";
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
  const highSeverityCount = flags.filter((f) => f.severity === "high").length;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 4 }}>Bar Operations</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em", lineHeight: 1 }}>Daily Overview</h1>
          <p style={{ fontSize: 13, color: "#8b949e", marginTop: 4 }}>Variance, forecasts, and AI insights for this location</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn-secondary btn-sm" href="/variance">Full Variance Report</Link>
          <button className="btn-primary btn-sm" onClick={() => { setLoading(true); void load(); }}>
            {loading ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[
          {
            label: "Variance This Week",
            value: loading ? "—" : `${varianceTotalOz.toFixed(1)} oz`,
            meta: latestVarianceWeek ? `Week of ${new Date(latestVarianceWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No data yet",
            color: loading ? "#d4a853" : varianceTotalOz > 0 ? "#ef4444" : "#22c55e",
          },
          {
            label: "Active Flags",
            value: loading ? "—" : String(flags.length),
            meta: loading ? "" : highSeverityCount > 0 ? `${highSeverityCount} high severity` : "None critical",
            color: loading ? "#d4a853" : flags.length > 0 ? "#ef4444" : "#22c55e",
          },
          {
            label: "Items Tracked",
            value: loading ? "—" : trackedItems ? String(trackedItems) : "—",
            meta: "14-day forecast active",
            color: "#d4a853",
          },
          {
            label: "Next Forecast",
            value: nextForecast ? new Date(nextForecast.forecast_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—",
            meta: nextForecast ? `${nextForecast.forecast_usage_oz} oz expected` : "Building forecast",
            color: "#d4a853",
          },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e", marginBottom: 8 }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: kpi.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 6 }}>{kpi.meta}</p>
          </div>
        ))}
      </div>

      {/* ── AI Insights ── */}
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
          { label: "Variance this week", value: loading ? "—" : `${varianceTotalOz.toFixed(1)} oz`, meta: latestVarianceWeek ? `Week of ${new Date(latestVarianceWeek).toLocaleDateString()}` : "No variance week yet" },
          { label: "Active flags", value: loading ? "—" : String(flags.length), meta: "Awaiting review" },
          { label: "Items tracked", value: loading ? "—" : trackedItems ? String(trackedItems) : "—", meta: "Forecast coverage" },
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
          ...(weeklyBrief?.next_actions ?? []).slice(0, 3).map((a) => ({ action: a.action, reason: a.why, urgency: "med" })),
          ...(dataGap?.gaps ?? []).slice(0, 2).map((g) => ({ action: g.gap, reason: g.expected_improvement, urgency: g.priority })),
          ...(shiftPush?.push_items ?? []).slice(0, 2).map((i) => ({ action: `Spotlight ${i.item}`, reason: i.why, urgency: i.priority })),
        ]}
        risks={(weeklyBrief?.watchouts ?? []).slice(0, 4).map((w) => ({ risk: w.title, impact: w.detail }))}
      />

      {/* ── Two-column: Variance Flags + Tonight's Push ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>

        {/* Variance Flags */}
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #1f2732" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Variance Flags</p>
              <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Potential shrink and over-pours to review</p>
            </div>
            <Link href="/variance" style={{ fontSize: 12, color: "#d4a853", fontWeight: 600, textDecoration: "none" }}>View all →</Link>
          </div>
          <div>
            {graphsEnabled && varianceView === "charts" ? (
              <div style={{ padding: "16px 20px" }}>
                {analyticsLoading ? (
                  <p style={{ fontSize: 13, color: "#8b949e" }}>Loading chart…</p>
                ) : analytics?.varianceByWeek?.length ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.07em" }}>8-Week Variance Trend</p>
                      <ViewToggle value={varianceView} onChange={setVarianceView} />
                    </div>
                    <LineChart
                      series={[{ name: "Variance (oz)", color: "#ef4444", data: analytics.varianceByWeek.map((row) => ({ x: new Date(row.week_start_date).getTime(), y: row.total_abs_variance_oz, label: new Date(row.week_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) })) }]}
                      valueFormat={(v) => `${v.toFixed(1)} oz`}
                      height={180}
                    />
                  </>
                ) : (
                  <p style={{ fontSize: 13, color: "#8b949e", textAlign: "center", padding: "20px 0" }}>No variance trend data yet</p>
                )}
              </div>
            ) : loading ? (
              <p style={{ padding: "20px 24px", fontSize: 13, color: "#8b949e" }}>Loading…</p>
            ) : flags.length === 0 ? (
              <div style={{ padding: "32px 24px", textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "#f0f6fc", marginBottom: 6 }}>No Variance Flags Yet</p>
                <p style={{ fontSize: 12, color: "#8b949e", marginBottom: 14 }}>Connect POS and start tracking inventory to surface variance signals.</p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <Link className="btn-primary btn-sm" href="/ingest">Connect POS</Link>
                  <Link className="btn-secondary btn-sm" href="/inventory">Add Inventory</Link>
                </div>
              </div>
            ) : (
              <>
                {graphsEnabled && (
                  <div style={{ padding: "10px 20px 0", display: "flex", justifyContent: "flex-end" }}>
                    <ViewToggle value={varianceView} onChange={setVarianceView} />
                  </div>
                )}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1f2732" }}>
                      {["Item", "Week", "Variance", "Severity"].map((h) => (
                        <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flags.slice(0, 6).map((flag, i) => {
                      const varianceNum = parseFloat(flag.variance_oz);
                      const severityClass = flag.severity === "high" ? "app-badge app-badge-red" : flag.severity === "med" ? "app-badge app-badge-gold" : "app-badge app-badge-green";
                      return (
                        <tr key={flag.id} style={{ borderBottom: i < Math.min(flags.length, 6) - 1 ? "1px solid #1a2230" : "none" }}>
                          <td style={{ padding: "10px 16px", fontWeight: 500, color: "#f0f6fc" }}>{flag.item_name}</td>
                          <td style={{ padding: "10px 16px", color: "#8b949e" }}>{new Date(flag.week_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                          <td style={{ padding: "10px 16px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: varianceNum < 0 ? "#ef4444" : "#22c55e" }}>{flag.variance_oz} oz</td>
                          <td style={{ padding: "10px 16px" }}><span className={severityClass}>{flag.severity}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>

        {/* Tonight's Push / Weekly Brief */}
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
          {shiftPush && aiEnabled.shiftPush ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🍸</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Tonight&apos;s Push</p>
                  <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>AI-recommended items to spotlight this shift</p>
                </div>
              </div>
              <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {shiftPush.push_items.map((item) => (
                  <div key={item.item} style={{
                    background: "#1a2230",
                    border: `1px solid #2a3240`,
                    borderLeft: `3px solid ${item.priority === "high" ? "#d4a853" : "#2a3240"}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f6fc" }}>{item.item}</span>
                      <span className={item.priority === "high" ? "app-badge app-badge-gold" : "app-badge app-badge-muted"}>{item.priority}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#8b949e", marginBottom: 6 }}>{item.why}</p>
                    <p style={{ fontSize: 12, color: "#c9d1d9", fontStyle: "italic" }}>&ldquo;{item.script}&rdquo;</p>
                  </div>
                ))}
              </div>
            </>
          ) : weeklyBrief && aiEnabled.weeklyBrief ? (
            <>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(212,168,83,0.2)", background: "rgba(212,168,83,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🧠</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "#d4a853" }}>Weekly Brief</p>
                  <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{weeklyBrief.week_range}</p>
                </div>
              </div>
              <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e", marginBottom: 8 }}>Wins</p>
                  {weeklyBrief.wins.slice(0, 3).map((w) => (
                    <div key={w.title} style={{ marginBottom: 8 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: "#f0f6fc" }}>{w.title}</p>
                      <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{w.detail}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 8 }}>Watch</p>
                  {weeklyBrief.watchouts.slice(0, 3).map((w) => (
                    <div key={w.title} style={{ marginBottom: 8 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, color: "#f0f6fc" }}>{w.title}</p>
                      <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{w.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              {aiLoading ? (
                <p style={{ fontSize: 13, color: "#8b949e" }}>Loading AI insights…</p>
              ) : (
                <>
                  <p style={{ fontWeight: 600, color: "#f0f6fc", marginBottom: 6 }}>No AI Insights Yet</p>
                  <p style={{ fontSize: 12, color: "#8b949e" }}>Staff push and weekly briefs will appear once data is available.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Forecast Charts ── */}
      {graphsEnabled ? (
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>14-Day Demand Forecast</p>
              <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Predicted usage by day and top items</p>
            </div>
            <ViewToggle value={forecastView} onChange={setForecastView} />
          </div>
          <div style={{ padding: "20px" }}>
            {analyticsLoading ? (
              <p style={{ fontSize: 13, color: "#8b949e" }}>Loading forecast…</p>
            ) : analyticsError ? (
              <p style={{ fontSize: 13, color: "#8b949e" }}>{analyticsError}</p>
            ) : analytics?.forecastByDay?.length ? (
              forecastView === "charts" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 12 }}>Total Usage by Day</p>
                    <LineChart
                      series={[{ name: "Forecast usage (oz)", color: "#d4a853", data: analytics.forecastByDay.map((row) => ({ x: new Date(row.date).getTime(), y: row.total_usage_oz, label: new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) })) }]}
                      valueFormat={(v) => `${v.toFixed(0)} oz`}
                      height={200}
                    />
                  </div>
                  {analytics.topForecastItems?.length ? (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 12 }}>Top Items (14-Day)</p>
                      <BarChart
                        data={analytics.topForecastItems.map((row) => ({ label: row.item_name, value: row.total_usage_oz, color: "#d4a853" }))}
                        valueFormat={(v) => `${v.toFixed(0)} oz`}
                        variant="horizontal"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1f2732" }}>
                        {["Date", "Forecast Usage"].map((h) => (
                          <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.forecastByDay.slice(0, 14).map((row, i) => (
                        <tr key={row.date} style={{ borderBottom: i < analytics.forecastByDay.length - 1 ? "1px solid #1a2230" : "none" }}>
                          <td style={{ padding: "9px 16px", color: "#c9d1d9" }}>{new Date(row.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                          <td style={{ padding: "9px 16px", color: "#d4a853", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.total_usage_oz.toFixed(1)} oz</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <p style={{ fontWeight: 600, color: "#f0f6fc", marginBottom: 6 }}>Building Your Forecast</p>
                <p style={{ fontSize: 12, color: "#8b949e" }}>Forecast charts appear once we have 2–4 weeks of POS data.</p>
              </div>
            )}
          </div>
        </div>
      ) : forecast.length > 0 ? (
        <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732" }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Next 14-Day Forecast</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Daily ounces projected by item</p>
          </div>
          <div style={{ padding: "0" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2732" }}>
                  {["Date", "Forecast Usage"].map((h) => (
                    <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedForecast.slice(0, 10).map((row, i) => (
                  <tr key={`${row.inventory_item_id}-${row.forecast_date}`} style={{ borderBottom: i < 9 ? "1px solid #1a2230" : "none" }}>
                    <td style={{ padding: "9px 16px", color: "#c9d1d9" }}>{new Date(row.forecast_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
                    <td style={{ padding: "9px 16px", color: "#d4a853", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{row.forecast_usage_oz} oz</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ── Data Gap Advisor (when no top panel) ── */}
      {!aiTopEnabled && aiEnabled.dataGap && dataGap && (
        <AiCard title="Data Gap Advisor" subtitle="What to capture next for better accuracy." loading={false} error={null}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dataGap.gaps.map((gap) => (
              <div key={gap.gap} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", background: "#1a2230", borderRadius: 8, border: "1px solid #2a3240" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#f0f6fc" }}>{gap.gap}</div>
                  <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{gap.why_it_matters}</p>
                  <p style={{ fontSize: 12, color: "#c9d1d9", marginTop: 4 }}>{gap.how_to_collect}</p>
                </div>
                <span className={gap.priority === "high" ? "app-badge app-badge-red" : "app-badge app-badge-gold"}>{gap.priority}</span>
              </div>
            ))}
          </div>
        </AiCard>
      )}

      {/* ── Ask Your Data ── */}
      {enterpriseEnabled && (
        <AskYourData locationId={typeof window !== "undefined" ? (window.localStorage.getItem("barops.locationId") ?? undefined) : undefined} />
      )}
    </section>
  );
}
