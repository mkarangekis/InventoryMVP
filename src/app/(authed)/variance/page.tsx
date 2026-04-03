"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
import { ShrinkageClusterWidget } from "@/components/ai/ShrinkageClusterWidget";
import { AiVarianceExplain } from "@/ai/types";
import {
  isAiTopPanelEnabled,
  isGraphsOverviewEnabled,
} from "@/config/flags";
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

export default function VariancePage() {
  const [flags, setFlags] = useState<VarianceFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiExplain, setAiExplain] = useState<AiVarianceExplain | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const enterpriseEnabled = isEnterpriseUIEnabled();
  const aiTopEnabled = isAiTopPanelEnabled();
  const graphsEnabled = isGraphsOverviewEnabled();

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

    const response = await fetch(`/api/variance${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const payload = (await response.json()) as { flags: VarianceFlag[] };
      setFlags(payload.flags);
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

    const response = await fetch(`/api/v1/ai/variance-explain${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      setAiEnabled(false);
      setAiLoading(false);
      return;
    }

    if (response.ok) {
      setAiExplain((await response.json()) as AiVarianceExplain);
    }
    setAiLoading(false);
  };

  useEffect(() => {
    void load();
    void loadAi();

    const handleLocationChange = () => {
      void load();
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

  if (!enterpriseEnabled) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Variance & Shrink</h1>
        <p className="text-sm text-gray-600">
          Weekly variance flags by inventory item.
        </p>

        <AIInsightsTopPanel
          pageContext="variance"
          loading={aiLoading}
          error={
            !aiEnabled
              ? "AI variance explanation is not enabled for this workspace."
              : !aiExplain
                ? "No variance explanation available yet."
                : null
          }
          summary={aiExplain?.non_accusatory_note ?? null}
          recommendations={(aiExplain?.findings ?? []).slice(0, 6).map((f) => ({
            action: `Review ${f.item}`,
            reason: `Variance ${f.variance_pct.toFixed(1)}%`,
            urgency: f.severity,
          }))}
          risks={(aiExplain?.findings ?? [])
            .filter((f) => f.severity === "high")
            .slice(0, 3)
            .map((f) => ({
              risk: `${f.item} variance`,
              impact: `${f.variance_pct.toFixed(1)}% flagged`,
            }))}
        />

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
      </section>
    );
  }

  const totalVarianceOz = flags.reduce((sum, f) => sum + Math.abs(parseFloat(f.variance_oz) || 0), 0);
  const highSeverityCount = flags.filter((f) => f.severity === "high").length;
  const medSeverityCount = flags.filter((f) => f.severity === "med").length;
  const weekSet = new Set(flags.map((f) => f.week_start_date));

  return (
    <section className="space-y-6">
      {/* ── Page Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 6 }}>Shrinkage Control</p>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Variance &amp; Shrinkage</h1>
          <p style={{ fontSize: 13, color: "#8b949e", marginTop: 6 }}>Weekly variance flags by inventory item. Identify over-pours, theft, and measurement issues.</p>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          { label: "Total Variance", value: loading ? "—" : `${totalVarianceOz.toFixed(1)} oz`, meta: "Absolute this week", color: loading ? "#8b949e" : totalVarianceOz > 10 ? "#ef4444" : "#22c55e" },
          { label: "Active Flags", value: loading ? "—" : String(flags.length), meta: "Awaiting review", color: loading ? "#8b949e" : flags.length > 0 ? "#ef4444" : "#22c55e" },
          { label: "High Severity", value: loading ? "—" : String(highSeverityCount), meta: `${medSeverityCount} medium`, color: highSeverityCount > 0 ? "#ef4444" : "#22c55e" },
          { label: "Weeks Covered", value: loading ? "—" : String(weekSet.size), meta: "In dataset", color: "#d4a853" },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e" }}>{kpi.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: kpi.color, marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{kpi.value}</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>{kpi.meta}</p>
          </div>
        ))}
      </div>

      {/* ── AI Insights ── */}
      <AIInsightsTopPanel
        pageContext="variance"
        loading={aiLoading}
        error={
          !aiEnabled
            ? "AI variance explanation is not enabled for this workspace."
            : !aiExplain
              ? "No variance explanation available yet."
              : null
        }
        summary={aiExplain?.non_accusatory_note ?? null}
        recommendations={(aiExplain?.findings ?? []).slice(0, 6).map((f) => ({
          action: `Review ${f.item}`,
          reason: `Variance ${f.variance_pct.toFixed(1)}%`,
          urgency: f.severity,
        }))}
        risks={(aiExplain?.findings ?? [])
          .filter((f) => f.severity === "high")
          .slice(0, 3)
          .map((f) => ({
            risk: `${f.item} variance`,
            impact: `${f.variance_pct.toFixed(1)}% flagged`,
          }))}
      />

      {/* ── Variance Flags Table ── */}
      <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #1f2732", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#f0f6fc" }}>Variance Flags</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>Potential shrink and over-pours to investigate</p>
          </div>
          {!loading && flags.length > 0 && (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {totalVarianceOz.toFixed(1)} oz total
            </span>
          )}
        </div>
        {loading ? (
          <p style={{ padding: "20px 24px", color: "#8b949e", fontSize: 13 }}>Loading variance...</p>
        ) : flags.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p style={{ fontWeight: 600, color: "#f0f6fc", marginBottom: 6 }}>No Variance Flags Yet</p>
            <p style={{ fontSize: 12, color: "#8b949e" }}>Connect your POS and complete inventory counts to surface variance signals.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2732" }}>
                  {["Item", "Week", "Expected", "Actual", "Variance", "Severity"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8b949e", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flags.map((flag, i) => {
                  const varianceNum = parseFloat(flag.variance_oz);
                  const severityClass =
                    flag.severity === "high" ? "app-badge app-badge-red" :
                    flag.severity === "med" ? "app-badge app-badge-gold" :
                    "app-badge app-badge-green";
                  return (
                    <tr key={flag.id} style={{ borderBottom: i < flags.length - 1 ? "1px solid #1a2230" : "none" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "#f0f6fc" }}>{flag.item_name}</td>
                      <td style={{ padding: "10px 16px", color: "#8b949e" }}>
                        {new Date(flag.week_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{flag.expected_remaining_oz} oz</td>
                      <td style={{ padding: "10px 16px", color: "#8b949e", fontVariantNumeric: "tabular-nums" }}>{flag.actual_remaining_oz} oz</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600, fontVariantNumeric: "tabular-nums", color: varianceNum < 0 ? "#ef4444" : "#22c55e" }}>
                        {flag.variance_oz} oz
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span className={severityClass}>{flag.severity}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Variance Charts ── */}
      {graphsEnabled && flags.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Trend line */}
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 14 }}>Abs Variance by Week (oz)</p>
            <LineChart
              series={[{
                name: "Abs variance (oz)",
                color: "#ef4444",
                data: (() => {
                  const map = new Map<string, number>();
                  for (const row of flags) {
                    const prev = map.get(row.week_start_date) ?? 0;
                    const v = Number.parseFloat(row.variance_oz);
                    map.set(row.week_start_date, prev + (Number.isNaN(v) ? 0 : Math.abs(v)));
                  }
                  return Array.from(map.entries())
                    .map(([week, total]) => ({ x: new Date(week).getTime(), y: total, label: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }) }))
                    .sort((a, b) => a.x - b.x);
                })(),
              }]}
              valueFormat={(v) => `${v.toFixed(1)} oz`}
              height={180}
            />
          </div>
          {/* Horizontal bar: top items by variance % */}
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e", marginBottom: 14 }}>Top Items by Variance %</p>
            <BarChart
              variant="horizontal"
              data={[...flags]
                .sort((a, b) => Math.abs(Number.parseFloat(b.variance_pct)) - Math.abs(Number.parseFloat(a.variance_pct)))
                .slice(0, 8)
                .map((row) => ({
                  label: row.item_name,
                  value: Math.abs(Number.parseFloat(row.variance_pct)) || 0,
                  color: row.severity === "high" ? "#ef4444" : row.severity === "med" ? "#d4a853" : "#22c55e",
                }))}
              valueFormat={(v) => `${v.toFixed(1)}%`}
            />
          </div>
        </div>
      ) : null}

      {/* ── AI Explain Card (fallback) ── */}
      {!aiTopEnabled && aiEnabled ? (
        <AiCard
          title="AI Variance Explanation"
          subtitle="Possible causes and recommended checks."
          loading={aiLoading}
          error={!aiExplain ? "No variance explanation available yet." : null}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {aiExplain?.non_accusatory_note && (
              <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6, borderLeft: "2px solid rgba(212,168,83,0.4)", paddingLeft: 12 }}>
                {aiExplain.non_accusatory_note}
              </p>
            )}
            {aiExplain?.findings.map((finding) => (
              <div key={`${finding.item}-${finding.severity}`} style={{ background: "#1a2230", borderRadius: 8, border: "1px solid #2a3240", padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "#f0f6fc" }}>{finding.item}</span>
                  <span className={finding.severity === "high" ? "app-badge app-badge-red" : finding.severity === "med" ? "app-badge app-badge-gold" : "app-badge app-badge-green"}>{finding.severity}</span>
                </div>
                <p style={{ fontSize: 11, color: "#8b949e", marginBottom: 8 }}>Variance: {finding.variance_pct.toFixed(1)}%</p>
                {finding.hypotheses.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#d4a853", marginBottom: 4 }}>Possible Causes</p>
                    {finding.hypotheses.map((h) => (
                      <p key={h} style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 2 }}>• {h}</p>
                    ))}
                  </div>
                )}
                {finding.recommended_checks.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#22c55e", marginBottom: 4 }}>Recommended Checks</p>
                    {finding.recommended_checks.map((c) => (
                      <p key={c} style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 2 }}>• {c}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AiCard>
      ) : null}

      {/* ── Shrinkage Clusters ── */}
      <ShrinkageClusterWidget
        locationId={typeof window !== "undefined" ? (window.localStorage.getItem("barops.locationId") ?? undefined) : undefined}
      />
    </section>
  );
}
