"use client";

import { useState } from "react";
import Link from "next/link";
import {
  demoVarianceFlags,
  demoProfitRanking,
  demoPurchaseOrders,
  demoAiWeeklyBrief,
  demoAiShiftPush,
  demoShrinkageClusters,
  demoAnalyticsOverview,
  demoNeedVsOnhand,
  demoAuditLogs,
  demoNotificationPrefs,
  demoAiVarianceExplain,
  demoAiOrderingSummary,
  DEMO_EMAIL,
} from "@/lib/demo";

const GOLD = "#d4a853";
const RED = "#ef4444";
const GREEN = "#22c55e";
const YELLOW = "#f59e0b";
const BLUE = "#3b82f6";
const PURPLE = "#a78bfa";
const MUTED = "#8b949e";

const severityColor = (s: string) =>
  s === "high" ? RED : s === "med" ? YELLOW : GREEN;

const urgencyColor = (u: string) =>
  u === "high" ? RED : u === "med" ? YELLOW : GREEN;

const typeColor: Record<string, string> = {
  pour_variance: YELLOW,
  theft_pattern: RED,
  waste: PURPLE,
  data_quality: BLUE,
  over_spec: "#06b6d4",
  other: MUTED,
};

const typeLabel: Record<string, string> = {
  pour_variance: "Pour Variance",
  theft_pattern: "Theft Pattern",
  waste: "Waste",
  data_quality: "Data Quality",
  over_spec: "Over-Spec",
};

const fmt = (v: number, dec = 1) => v.toFixed(dec);

type Tab = "dashboard" | "variance" | "profit" | "ordering" | "audit" | "ai";

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [expandedPO, setExpandedPO] = useState<string | null>(null);

  // suppress unused import warning — demoNotificationPrefs is imported for completeness
  void demoNotificationPrefs;

  const totalVarianceOz = demoVarianceFlags
    .filter((f) => f.week_start_date === demoVarianceFlags[0]?.week_start_date)
    .reduce((s, f) => s + Math.abs(parseFloat(f.variance_oz)), 0);

  const totalRevenue = demoProfitRanking.reduce((s, r) => s + r.revenue, 0);
  const avgMargin = demoProfitRanking.reduce((s, r) => s + r.margin_pct, 0) / demoProfitRanking.length;
  const totalDraftPOValue = demoPurchaseOrders
    .filter((p) => p.status === "draft")
    .reduce((s, p) => s + p.lines.reduce((ls, l) => ls + l.line_total, 0), 0);

  // suppress unused variable warning
  void totalDraftPOValue;

  return (
    <div
      className="enterprise-theme"
      style={{ minHeight: "100vh", color: "#f8fafc" }}
    >
      {/* ── Sticky Nav ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(11,16,22,0.96)",
          borderBottom: "1px solid #1f2732",
          backdropFilter: "blur(16px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${GOLD}, #c49a48)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
                color: "#0b1016",
              }}
            >
              P
            </span>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#f8fafc" }}>
              Pourdex Bar Ops
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "rgba(212,168,83,0.15)",
                color: GOLD,
                borderRadius: 4,
                padding: "2px 8px",
                border: "1px solid rgba(212,168,83,0.3)",
              }}
            >
              Live Demo
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, color: MUTED }}>
              Mitchell&apos;s Cocktail Bar — Midtown
            </span>
            <Link
              href="/login"
              style={{
                background: GOLD,
                color: "#0b1016",
                fontWeight: 700,
                fontSize: 13,
                padding: "7px 16px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Demo Banner ── */}
      <div
        style={{
          background: "rgba(212,168,83,0.08)",
          borderBottom: "1px solid rgba(212,168,83,0.2)",
          padding: "10px 24px",
          textAlign: "center",
          fontSize: 13,
          color: GOLD,
        }}
      >
        <span style={{ fontWeight: 600 }}>Interactive demo</span> — All data shown is
        sample data for Mitchell&apos;s Cocktail Bar — Midtown.{" "}
        <Link href="/login" style={{ color: GOLD, fontWeight: 700 }}>
          Sign in with {DEMO_EMAIL}
        </Link>{" "}
        to explore the full app.
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* ── Tab Nav ── */}
        <nav
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 32,
            flexWrap: "wrap",
            borderBottom: "1px solid #1f2732",
            paddingBottom: 0,
          }}
        >
          {(
            [
              { key: "dashboard", label: "Dashboard" },
              { key: "variance", label: "Variance & Shrinkage" },
              { key: "profit", label: "Profit" },
              { key: "ordering", label: "Ordering" },
              { key: "audit", label: "Audit Trail" },
              { key: "ai", label: "AI Insights" },
            ] as { key: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? GOLD : MUTED,
                background: "none",
                border: "none",
                borderBottom: tab === t.key ? `2px solid ${GOLD}` : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* ──────────────────────── DASHBOARD ──────────────────────── */}
        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* KPI Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
              }}
            >
              {[
                { label: "Variance This Week", value: `${fmt(totalVarianceOz)} oz`, meta: "Across 5 active flags", color: RED },
                { label: "Active Flags", value: "5", meta: "2 high severity", color: RED },
                { label: "Items Tracked", value: "10", meta: "14-day forecast active", color: GOLD },
                { label: "Weekly Revenue", value: `$${totalRevenue.toLocaleString()}`, meta: "8 cocktail SKUs", color: GREEN },
                { label: "Avg Menu Margin", value: `${fmt(avgMargin)}%`, meta: "Target: 65%+", color: GOLD },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    background: "#141a22",
                    border: "1px solid #2a3240",
                    borderRadius: 12,
                    padding: "18px 20px",
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, marginBottom: 8 }}>
                    {kpi.label}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: kpi.color, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                    {kpi.value}
                  </p>
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>{kpi.meta}</p>
                </div>
              ))}
            </div>

            {/* Weekly Brief Summary */}
            <div
              style={{
                background: "rgba(212,168,83,0.06)",
                border: "1px solid rgba(212,168,83,0.2)",
                borderRadius: 12,
                padding: "20px 24px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🧠</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: GOLD }}>
                  AI Weekly Brief — {demoAiWeeklyBrief.week_range}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: MUTED }}>
                  {fmt(demoAiWeeklyBrief.estimated_roi.waste_reduced_usd, 0)} saved · {demoAiWeeklyBrief.estimated_roi.time_saved_hours}h reclaimed
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: GREEN, letterSpacing: "0.08em", marginBottom: 8 }}>
                    Wins
                  </p>
                  {demoAiWeeklyBrief.wins.map((w) => (
                    <div key={w.title} style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#f0f6fc" }}>{w.title}</span>
                      <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{w.detail}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: RED, letterSpacing: "0.08em", marginBottom: 8 }}>
                    Watchouts
                  </p>
                  {demoAiWeeklyBrief.watchouts.map((w) => (
                    <div key={w.title} style={{ marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#f0f6fc" }}>{w.title}</span>
                      <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{w.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Variance Trend + Forecast side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Variance Trend (8 weeks)</p>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Improving — down 30% from peak</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {demoAnalyticsOverview.varianceByWeek.map((row, i) => {
                    const maxVal = Math.max(...demoAnalyticsOverview.varianceByWeek.map((r) => r.total_abs_variance_oz));
                    const pct = (row.total_abs_variance_oz / maxVal) * 100;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: MUTED, width: 60, flexShrink: 0 }}>
                          {new Date(row.week_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        <div style={{ flex: 1, height: 8, background: "#1f2732", borderRadius: 4 }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: 8,
                              borderRadius: 4,
                              background: i === demoAnalyticsOverview.varianceByWeek.length - 1
                                ? GOLD
                                : "rgba(212,168,83,0.35)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: "#f0f6fc", width: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {row.total_abs_variance_oz} oz
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Top Items by 14-Day Forecast</p>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Expected usage this fortnight</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {demoAnalyticsOverview.topForecastItems.map((item, i) => {
                    const maxVal = demoAnalyticsOverview.topForecastItems[0]?.total_usage_oz ?? 1;
                    const pct = (item.total_usage_oz / maxVal) * 100;
                    return (
                      <div key={i}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#f0f6fc" }}>{item.item_name}</span>
                          <span style={{ fontSize: 12, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
                            {item.total_usage_oz} oz
                          </span>
                        </div>
                        <div style={{ height: 6, background: "#1f2732", borderRadius: 3 }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: 6,
                              borderRadius: 3,
                              background: GOLD,
                              opacity: 0.7 + (0.3 * (5 - i)) / 5,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tonight's Push */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Tonight&apos;s Staff Push</span>
                <span style={{ fontSize: 11, color: MUTED }}>AI-recommended items to spotlight this shift</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {demoAiShiftPush.push_items.map((item) => (
                  <div
                    key={item.item}
                    style={{
                      background: "#1a2230",
                      border: `1px solid #2a3240`,
                      borderLeft: `3px solid ${item.priority === "high" ? GOLD : MUTED}`,
                      borderRadius: 8,
                      padding: "14px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{item.item}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: item.priority === "high" ? GOLD : MUTED,
                          background: item.priority === "high" ? "rgba(212,168,83,0.12)" : "rgba(139,148,158,0.1)",
                          borderRadius: 4,
                          padding: "2px 6px",
                        }}
                      >
                        {item.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{item.why}</p>
                    <p style={{ fontSize: 12, color: "#c9d1d9", fontStyle: "italic" }}>&ldquo;{item.script}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── VARIANCE ──────────────────────── */}
        {tab === "variance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2732", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Variance Flags</p>
                  <p style={{ fontSize: 12, color: MUTED }}>Current and previous week</p>
                </div>
                <span style={{ fontSize: 13, color: RED, fontWeight: 600 }}>
                  {fmt(totalVarianceOz)} oz total this week
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2732" }}>
                    {["Item", "Week", "Expected", "Actual", "Variance", "Severity"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoVarianceFlags.map((f) => (
                    <tr key={f.id} style={{ borderBottom: "1px solid #1a2230" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500 }}>{f.item_name}</td>
                      <td style={{ padding: "10px 16px", color: MUTED }}>
                        {new Date(f.week_start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontVariantNumeric: "tabular-nums" }}>{f.expected_remaining_oz} oz</td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontVariantNumeric: "tabular-nums" }}>{f.actual_remaining_oz} oz</td>
                      <td style={{ padding: "10px 16px", color: parseFloat(f.variance_oz) < 0 ? RED : GREEN, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {f.variance_oz} oz ({f.variance_pct}%)
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          color: severityColor(f.severity),
                          background: `${severityColor(f.severity)}22`,
                          borderRadius: 4, padding: "3px 8px",
                        }}>
                          {f.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Shrinkage Clusters */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>AI Shrinkage Clusters</p>
                <span style={{ fontSize: 11, color: MUTED }}>Behavioral loss patterns grouped by Claude AI</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {demoShrinkageClusters.clusters.map((c) => (
                  <div
                    key={c.cluster_id}
                    style={{
                      background: "#141a22",
                      border: "1px solid #2a3240",
                      borderLeft: `3px solid ${typeColor[c.type] ?? GOLD}`,
                      borderRadius: 10,
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedCluster(e => e === c.cluster_id ? null : c.cluster_id)}
                  >
                    <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
                          color: typeColor[c.type] ?? GOLD,
                          background: `${typeColor[c.type] ?? GOLD}22`,
                          borderRadius: 4, padding: "2px 7px",
                        }}>
                          {typeLabel[c.type] ?? c.type}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{c.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13, color: RED, fontWeight: 700 }}>${c.total_shrinkage_usd}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: urgencyColor(c.urgency), textTransform: "uppercase" }}>{c.urgency}</span>
                        <span style={{ color: MUTED, fontSize: 12 }}>{expandedCluster === c.cluster_id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {expandedCluster === c.cluster_id && (
                      <div style={{ padding: "12px 18px", borderTop: "1px solid #1f2732" }}>
                        <p style={{ fontSize: 12, color: "#c9d1d9", marginBottom: 10 }}>{c.description}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                          {c.items.map((item) => (
                            <span key={item} style={{
                              background: "#1a2230", border: "1px solid #2a3240",
                              borderRadius: 4, padding: "3px 10px", fontSize: 11, color: "#c9d1d9",
                            }}>{item}</span>
                          ))}
                        </div>
                        <div style={{
                          background: "rgba(212,168,83,0.07)", border: "1px solid rgba(212,168,83,0.2)",
                          borderRadius: 8, padding: "10px 14px", fontSize: 12, color: GOLD,
                        }}>
                          <strong>Recommended Action:</strong> {c.recommended_action}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Variance Explain */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Variance Explain — AI Analysis</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>{demoAiVarianceExplain.non_accusatory_note}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {demoAiVarianceExplain.findings.map((f) => (
                  <div key={f.item} style={{ background: "#1a2230", borderRadius: 8, padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{f.item}</span>
                      <span style={{ fontSize: 12, color: severityColor(f.severity), fontWeight: 600 }}>
                        {f.variance_pct}%
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>Hypotheses</p>
                        {f.hypotheses.map((h) => (
                          <p key={h} style={{ fontSize: 11, color: "#c9d1d9", marginBottom: 3 }}>• {h}</p>
                        ))}
                      </div>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: GOLD, marginBottom: 6 }}>Recommended Checks</p>
                        {f.recommended_checks.map((rc) => (
                          <p key={rc} style={{ fontSize: 11, color: "#c9d1d9", marginBottom: 3 }}>→ {rc}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── PROFIT ──────────────────────── */}
        {tab === "profit" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2732" }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Profit Ranking</p>
                <p style={{ fontSize: 12, color: MUTED }}>All menu items ranked by margin · {demoProfitRanking.length} items tracked</p>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #1f2732" }}>
                    {["#", "Item", "Sold", "Revenue", "Cost/Serve", "Margin %", "Action"].map((h) => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demoProfitRanking.map((row, i) => (
                    <tr key={row.menu_item_id} style={{ borderBottom: "1px solid #1a2230" }}>
                      <td style={{ padding: "10px 16px", color: MUTED, fontWeight: 700 }}>#{i + 1}</td>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{row.name}</td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontVariantNumeric: "tabular-nums" }}>{row.qty_sold}</td>
                      <td style={{ padding: "10px 16px", color: GREEN, fontVariantNumeric: "tabular-nums" }}>${row.revenue.toLocaleString()}</td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontVariantNumeric: "tabular-nums" }}>${fmt(row.cost_per_serv)}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          fontWeight: 700, fontSize: 13,
                          color: row.margin_pct >= 70 ? GREEN : row.margin_pct >= 60 ? GOLD : RED,
                          fontVariantNumeric: "tabular-nums",
                        }}>
                          {fmt(row.margin_pct)}%
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {row.recommendations.length > 0 && (
                          <span style={{ fontSize: 11, color: GOLD }}>{row.recommendations[0]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Need vs Onhand */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Inventory vs 14-Day Forecast Need</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>
                Snapshot from {demoNeedVsOnhand.snapshotDate} — gold bar = forecast, dimmed bar = on hand
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {demoNeedVsOnhand.items.map((item) => {
                  const maxVal = Math.max(1, ...demoNeedVsOnhand.items.flatMap((i) => [i.on_hand_oz, i.forecast_next_14d_oz]));
                  const onHandPct = Math.min(100, (item.on_hand_oz / maxVal) * 100);
                  const forecastPct = Math.min(100, (item.forecast_next_14d_oz / maxVal) * 100);
                  const risk = item.on_hand_oz < item.forecast_next_14d_oz;
                  return (
                    <div
                      key={item.inventory_item_id}
                      style={{
                        background: "#1a2230",
                        border: `1px solid ${risk ? "rgba(239,68,68,0.3)" : "#2a3240"}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.item_name}</span>
                        <span style={{ fontSize: 11, color: risk ? RED : GREEN, fontWeight: 600 }}>
                          {risk ? "⚠ Reorder needed" : "✓ Stocked"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: MUTED, width: 70 }}>On hand</span>
                        <div style={{ flex: 1, height: 6, background: "#1f2732", borderRadius: 3 }}>
                          <div style={{ width: `${onHandPct}%`, height: 6, background: "rgba(212,168,83,0.3)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: MUTED, width: 50, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {item.on_hand_oz} oz
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: MUTED, width: 70 }}>14d need</span>
                        <div style={{ flex: 1, height: 6, background: "#1f2732", borderRadius: 3 }}>
                          <div style={{ width: `${forecastPct}%`, height: 6, background: GOLD, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: GOLD, width: 50, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {item.forecast_next_14d_oz} oz
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────── ORDERING ──────────────────────── */}
        {tab === "ordering" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* AI Summary */}
            <div style={{
              background: "rgba(212,168,83,0.06)",
              border: "1px solid rgba(212,168,83,0.2)",
              borderRadius: 12, padding: "18px 20px",
            }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: GOLD }}>AI Ordering Summary</p>
              <p style={{ fontSize: 13, color: "#c9d1d9", marginBottom: 12 }}>{demoAiOrderingSummary.summary}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {demoAiOrderingSummary.top_actions.map((a) => (
                  <div key={a.action} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: urgencyColor(a.urgency), background: `${urgencyColor(a.urgency)}22`, borderRadius: 4, padding: "2px 6px", marginTop: 2, flexShrink: 0 }}>
                      {a.urgency}
                    </span>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{a.action}</span>
                      <p style={{ fontSize: 11, color: MUTED }}>{a.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* POs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {demoPurchaseOrders.map((po) => {
                const total = po.lines.reduce((s, l) => s + l.line_total, 0);
                return (
                  <div
                    key={po.id}
                    style={{
                      background: "#141a22",
                      border: "1px solid #2a3240",
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: "pointer",
                    }}
                    onClick={() => setExpandedPO((e) => e === po.id ? null : po.id)}
                  >
                    <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{po.vendor?.name}</span>
                        <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          {po.lines.length} line items · Created {new Date(po.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: GREEN, fontVariantNumeric: "tabular-nums" }}>
                          ${total}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          color: po.status === "draft" ? YELLOW : GREEN,
                          background: po.status === "draft" ? `${YELLOW}22` : `${GREEN}22`,
                          borderRadius: 4, padding: "3px 8px",
                        }}>
                          {po.status}
                        </span>
                        <span style={{ color: MUTED, fontSize: 12 }}>{expandedPO === po.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {expandedPO === po.id && (
                      <div style={{ borderTop: "1px solid #1f2732" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #1f2732", background: "#1a2230" }}>
                              {["Item", "Qty", "Unit Price", "Line Total"].map((h) => (
                                <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: MUTED, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {po.lines.map((line) => (
                              <tr key={line.inventory_item_id} style={{ borderBottom: "1px solid #1a2230" }}>
                                <td style={{ padding: "10px 16px" }}>{line.item_name}</td>
                                <td style={{ padding: "10px 16px", color: MUTED }}>{line.qty_units}</td>
                                <td style={{ padding: "10px 16px", color: MUTED, fontVariantNumeric: "tabular-nums" }}>${line.unit_price}</td>
                                <td style={{ padding: "10px 16px", color: GREEN, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${line.line_total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {po.status === "draft" && (
                          <div style={{ padding: "12px 20px", display: "flex", gap: 10 }}>
                            <button
                              style={{
                                background: GOLD, color: "#0b1016", fontWeight: 700, fontSize: 12,
                                padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                              }}
                              onClick={(e) => { e.stopPropagation(); alert("Sign in to approve orders →  /login"); }}
                            >
                              Approve PO (${total})
                            </button>
                            <button
                              style={{
                                background: "transparent", color: MUTED, fontWeight: 600, fontSize: 12,
                                padding: "8px 20px", borderRadius: 8, border: "1px solid #2a3240", cursor: "pointer",
                              }}
                              onClick={(e) => { e.stopPropagation(); alert("Sign in to send to vendor →  /login"); }}
                            >
                              Send to Vendor
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────────────────── AUDIT ──────────────────────── */}
        {tab === "audit" && (
          <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1f2732", display: "flex", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Audit Trail</p>
                <p style={{ fontSize: 12, color: MUTED }}>All actions logged across the workspace · {demoAuditLogs.total} entries</p>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2732", background: "#1a2230" }}>
                  {["Action", "Entity", "User", "Time", "Details"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: MUTED }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {demoAuditLogs.logs.map((log) => {
                  const actionBase = log.action.split(".")[0];
                  const actionColorMap: Record<string, string> = {
                    ordering: BLUE, inventory: GOLD, ingest: PURPLE, variance: RED,
                    audit: MUTED, settings: "#06b6d4",
                  };
                  const ac = actionColorMap[actionBase] ?? MUTED;
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #1a2230" }}>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          color: ac, background: `${ac}22`, borderRadius: 4, padding: "2px 8px",
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: MUTED }}>{log.entity_type}</td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontSize: 11 }}>{log.user_profiles?.email ?? "—"}</td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontSize: 11 }}>
                        {new Date(log.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "10px 16px", color: MUTED, fontSize: 11, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ──────────────────────── AI INSIGHTS ──────────────────────── */}
        {tab === "ai" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Ask Your Data */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Ask Your Data</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Natural language queries powered by Claude AI</p>
              <div style={{ background: "#1a2230", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>Sample question:</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: GOLD }}>
                  &ldquo;What&apos;s my biggest cost issue this week?&rdquo;
                </p>
              </div>
              <div style={{
                background: "rgba(212,168,83,0.05)", border: "1px solid rgba(212,168,83,0.15)",
                borderRadius: 10, padding: 16,
              }}>
                <p style={{ fontSize: 11, color: GOLD, fontWeight: 700, marginBottom: 8 }}>Pourdex AI Response:</p>
                <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.6 }}>
                  Your biggest cost issue this week is <strong style={{ color: "#f0f6fc" }}>spirits shrinkage</strong>: Tito&apos;s Vodka (-23.2%) and Patrón Silver (-30.0%) together represent roughly <strong style={{ color: RED }}>$186 in over-usage</strong>. Both are trending worse on weekends. Tighten pour standards and run a quick bartender spot-check on Friday before service.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                  <button style={{ fontSize: 11, color: MUTED, background: "none", border: "1px solid #2a3240", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>👍 Helpful</button>
                  <button style={{ fontSize: 11, color: MUTED, background: "none", border: "1px solid #2a3240", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>👎 Not helpful</button>
                  <span style={{ fontSize: 11, color: MUTED }}>Powered by Claude Sonnet</span>
                </div>
              </div>
              <div style={{ marginTop: 14, textAlign: "center" }}>
                <Link href="/login" style={{
                  display: "inline-block", background: GOLD, color: "#0b1016",
                  fontWeight: 700, fontSize: 13, padding: "10px 24px", borderRadius: 8, textDecoration: "none",
                }}>
                  Sign in to ask your own questions →
                </Link>
              </div>
            </div>

            {/* Menu Suggestions */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>AI Menu Pricing Suggestions</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Price increase opportunities with modelled impact</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { drink: "House Margarita", current: 12, suggested: 13, impact: 284, rationale: "High volume, below avg margin. $1 raise = low resistance." },
                  { drink: "Gin & Tonic", current: 12, suggested: 13, impact: 196, rationale: "Tonic COGS up 12% — price needs to catch up." },
                  { drink: "Draft IPA", current: 8, suggested: 9, impact: 420, rationale: "Highest volume item. Below competitor avg." },
                ].map((s) => (
                  <div key={s.drink} style={{
                    background: "#1a2230", border: "1px solid #2a3240", borderRadius: 8, padding: "14px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{s.drink}</span>
                      <p style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s.rationale}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 11, color: MUTED }}>Current → Suggested</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#f0f6fc", fontVariantNumeric: "tabular-nums" }}>
                          ${s.current} → <span style={{ color: GOLD }}>${s.suggested}</span>
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 11, color: MUTED }}>Monthly impact</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: GREEN, fontVariantNumeric: "tabular-nums" }}>+${s.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Data Gap Advisor */}
            <div style={{ background: "#141a22", border: "1px solid #2a3240", borderRadius: 12, padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Data Gap Advisor</p>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>What to fill in next to improve AI accuracy</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { gap: "Missing vendor lead times on 6 items", impact: "Reduce stockouts ~15%", priority: "high" },
                  { gap: "No cost updates in 30 days", impact: "+8% margin accuracy", priority: "high" },
                  { gap: "No specs for Gin & Tonic, Moscow Mule", impact: "Enable variance detect on 2 more items", priority: "med" },
                ].map((g) => (
                  <div key={g.gap} style={{
                    background: "#1a2230", border: "1px solid #2a3240", borderRadius: 8,
                    padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{g.gap}</span>
                      <p style={{ fontSize: 11, color: GREEN, marginTop: 2 }}>Improvement: {g.impact}</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      color: g.priority === "high" ? RED : YELLOW,
                      background: g.priority === "high" ? `${RED}22` : `${YELLOW}22`,
                      borderRadius: 4, padding: "3px 8px",
                    }}>
                      {g.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CTA Footer ── */}
        <div
          style={{
            marginTop: 48,
            textAlign: "center",
            padding: "40px 24px",
            background: "rgba(212,168,83,0.05)",
            border: "1px solid rgba(212,168,83,0.15)",
            borderRadius: 16,
          }}
        >
          <p style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Ready to connect your bar?
          </p>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24, maxWidth: 480, margin: "0 auto 24px" }}>
            Sign in with your Google account or email and we&apos;ll set up your workspace in under 5 minutes.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/login"
              style={{
                background: GOLD, color: "#0b1016", fontWeight: 800,
                fontSize: 15, padding: "14px 32px", borderRadius: 10, textDecoration: "none",
              }}
            >
              Sign In / Start Free Trial
            </Link>
            <a
              href="mailto:pourdex@augmentationcg.com"
              style={{
                background: "transparent", color: "#f0f6fc", fontWeight: 600,
                fontSize: 15, padding: "14px 32px", borderRadius: 10, textDecoration: "none",
                border: "1px solid #2a3240",
              }}
            >
              Request a Demo
            </a>
          </div>
          <p style={{ marginTop: 16, fontSize: 12, color: MUTED }}>
            Demo mode · Sample data for Mitchell&apos;s Cocktail Bar — Midtown · Not real customer data
          </p>
        </div>
      </div>
    </div>
  );
}
