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

export function AIInsightsTopPanel(props: AIInsightsTopPanelProps) {
  const {
    pageContext,
    loading,
    error,
    summary,
    primaryMetrics,
    recommendations,
    risks,
  } = props;

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

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

  if (!isAiTopPanelEnabled()) {
    return null;
  }

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">AI Insights</h3>
          <p className="app-card-subtitle">
            Fast summary, actions, and risks for this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setCopyStatus(null);
              void navigator.clipboard
                .writeText(copyText)
                .then(() => setCopyStatus("Copied"))
                .catch((e: unknown) =>
                  setCopyStatus(e instanceof Error ? e.message : "Copy failed"),
                );
            }}
            disabled={loading || Boolean(error)}
            type="button"
          >
            Copy
          </button>
          <span className="app-pill">AI</span>
        </div>
      </div>

      <div className="app-card-body">
        {loading ? (
          <p className="text-sm text-[var(--enterprise-muted)]">
            Loading AI insights...
          </p>
        ) : error ? (
          <div className="app-empty">
            <div className="app-empty-title">AI insight unavailable</div>
            <p className="app-empty-desc">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {primaryMetrics?.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {primaryMetrics.slice(0, 6).map((m) => (
                  <div
                    key={`${m.label}-${m.value}`}
                    className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-3"
                  >
                    <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                      {m.label}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{m.value}</div>
                    {m.meta ? (
                      <div className="text-xs text-[var(--enterprise-muted)]">
                        {m.meta}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {summary ? (
              <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4 text-sm">
                <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Summary
                </div>
                <p className="mt-2 text-[var(--enterprise-muted)]">{summary}</p>
              </div>
            ) : null}

            {recommendations?.length ? (
              <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4 text-sm">
                <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Top actions
                </div>
                <ul className="mt-2 space-y-2">
                  {recommendations.slice(0, 6).map((action) => (
                    <li
                      key={`${action.action}-${action.urgency ?? ""}`}
                      className="flex items-start gap-2"
                    >
                      {action.urgency ? (
                        <span className="app-pill">{action.urgency}</span>
                      ) : null}
                      <div>
                        <div className="font-semibold">{action.action}</div>
                        {action.reason ? (
                          <div className="text-xs text-[var(--enterprise-muted)]">
                            {action.reason}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {risks?.length ? (
              <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-accent-soft)] p-4 text-sm">
                <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                  Risks to watch
                </div>
                <ul className="mt-2 list-disc pl-4 text-[var(--enterprise-muted)]">
                  {risks.slice(0, 6).map((risk) => (
                    <li key={risk.risk}>
                      <span className="font-semibold text-[var(--enterprise-ink)]">
                        {risk.risk}
                      </span>
                      {risk.impact ? ` — ${risk.impact}` : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!summary &&
            !(primaryMetrics?.length ?? 0) &&
            !(recommendations?.length ?? 0) &&
            !(risks?.length ?? 0) ? (
              <div className="app-empty">
                <div className="app-empty-title">No AI insights yet</div>
                <p className="app-empty-desc">
                  Connect POS, run inventory counts, and generate forecasts to
                  unlock recommendations.
                </p>
              </div>
            ) : null}

            {copyStatus ? (
              <p className="text-xs text-[var(--enterprise-muted)]">
                {copyStatus}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

