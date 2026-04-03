"use client";

import { useMemo, useState } from "react";
import { isAiTopPanelEnabled } from "@/config/flags";

export type AiTopPanelContext =
  | "overview"
  | "inventory"
  | "ordering"
  | "variance"
  | "settings";

export type AiTopPanelMetric = {
  label: string;
  value: string;
  meta?: string;
};

export type AiTopPanelRecommendation = {
  action: string;
  reason?: string;
  urgency?: string;
};

export type AiTopPanelRisk = {
  risk: string;
  impact?: string;
};

type AIInsightsTopPanelProps = {
  pageContext: AiTopPanelContext;
  orgId?: string | null;
  locationId?: string | null;
  loading?: boolean;
  error?: string | null;
  summary?: string | null;
  primaryMetrics?: AiTopPanelMetric[];
  recommendations?: AiTopPanelRecommendation[];
  risks?: AiTopPanelRisk[];
};

const urgencyColor = (u?: string) =>
  u === "high" ? "#ef4444" : u === "med" ? "#d4a853" : "#22c55e";

const urgencyBg = (u?: string) =>
  u === "high" ? "rgba(239,68,68,0.12)" : u === "med" ? "rgba(212,168,83,0.12)" : "rgba(34,197,94,0.1)";

export function AIInsightsTopPanel(props: AIInsightsTopPanelProps) {
  const { pageContext, loading, error, summary, primaryMetrics, recommendations, risks } = props;

  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const copyText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`AI insights: ${pageContext}`);
    if (summary) lines.push("", summary);
    if (recommendations?.length) {
      lines.push("", "Top actions:");
      for (const item of recommendations) {
        const prefix = item.urgency ? `[${item.urgency}] ` : "";
        const reason = item.reason ? ` (${item.reason})` : "";
        lines.push(`- ${prefix}${item.action}${reason}`);
      }
    }
    if (risks?.length) {
      lines.push("", "Risks:");
      for (const item of risks) {
        const impact = item.impact ? ` (${item.impact})` : "";
        lines.push(`- ${item.risk}${impact}`);
      }
    }
    return lines.join("\n");
  }, [pageContext, recommendations, risks, summary]);

  if (!isAiTopPanelEnabled()) return null;

  const hasContent = summary || (primaryMetrics?.length ?? 0) > 0 ||
    (recommendations?.length ?? 0) > 0 || (risks?.length ?? 0) > 0;

  return (
    <div style={{
      background: "rgba(212,168,83,0.05)",
      border: "1px solid rgba(212,168,83,0.2)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 20px",
        borderBottom: collapsed ? "none" : "1px solid rgba(212,168,83,0.15)",
        cursor: "pointer",
        userSelect: "none",
      }} onClick={() => setCollapsed((c) => !c)}>
        <span style={{ fontSize: 16 }}>🧠</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#d4a853" }}>
          AI Insights
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 500,
          color: "#8b949e",
          background: "rgba(212,168,83,0.1)",
          border: "1px solid rgba(212,168,83,0.2)",
          borderRadius: 4,
          padding: "1px 7px",
          textTransform: "capitalize",
        }}>
          {pageContext}
        </span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {!loading && hasContent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void navigator.clipboard.writeText(copyText)
                  .then(() => { setCopyStatus("Copied"); setTimeout(() => setCopyStatus(null), 2000); })
                  .catch(() => setCopyStatus("Failed"));
              }}
              style={{
                background: "transparent",
                border: "1px solid rgba(212,168,83,0.3)",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 11,
                color: "#d4a853",
                cursor: "pointer",
              }}
            >
              {copyStatus ?? "Copy"}
            </button>
          )}
          <span style={{ fontSize: 12, color: "#8b949e", transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s", display: "inline-block" }}>▾</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: "16px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#d4a853", animation: "pulse 1.2s infinite" }} />
              <span style={{ fontSize: 13, color: "#8b949e" }}>Generating AI insights...</span>
            </div>
          ) : error ? (
            <p style={{ fontSize: 13, color: "#8b949e", fontStyle: "italic" }}>{error}</p>
          ) : !hasContent ? (
            <p style={{ fontSize: 13, color: "#8b949e" }}>
              Connect your POS, run inventory counts, and generate forecasts to unlock AI recommendations.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Key metrics row */}
              {(primaryMetrics?.length ?? 0) > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                  {primaryMetrics!.slice(0, 6).map((m) => (
                    <div key={`${m.label}-${m.value}`} style={{
                      background: "rgba(212,168,83,0.07)",
                      border: "1px solid rgba(212,168,83,0.15)",
                      borderRadius: 8,
                      padding: "10px 14px",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#8b949e" }}>{m.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#d4a853", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
                      {m.meta && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{m.meta}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {summary && (
                <p style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.7, borderLeft: "2px solid rgba(212,168,83,0.4)", paddingLeft: 12 }}>
                  {summary}
                </p>
              )}

              {/* Actions + Risks two-column */}
              {((recommendations?.length ?? 0) > 0 || (risks?.length ?? 0) > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  {(recommendations?.length ?? 0) > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#22c55e", marginBottom: 10 }}>
                        Actions
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {recommendations!.slice(0, 5).map((r, i) => (
                          <div key={`${r.action}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{
                              flexShrink: 0,
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: urgencyBg(r.urgency),
                              color: urgencyColor(r.urgency),
                              border: `1px solid ${urgencyColor(r.urgency)}33`,
                              marginTop: 1,
                            }}>
                              {r.urgency ?? "—"}
                            </span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f6fc" }}>{r.action}</div>
                              {r.reason && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{r.reason}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(risks?.length ?? 0) > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#ef4444", marginBottom: 10 }}>
                        Watch
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {risks!.slice(0, 5).map((r, i) => (
                          <div key={`${r.risk}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: "#ef4444", fontSize: 14, flexShrink: 0, marginTop: 1 }}>⚠</span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f6fc" }}>{r.risk}</div>
                              {r.impact && <div style={{ fontSize: 11, color: "#8b949e", marginTop: 1 }}>{r.impact}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
