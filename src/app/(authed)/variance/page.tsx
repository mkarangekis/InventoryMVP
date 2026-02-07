"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isEnterpriseUIEnabled } from "@/config/flags";
import { AiCard } from "@/components/ai/AiCard";
import { AIInsightsTopPanel } from "@/components/ai/AIInsightsTopPanel";
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

  return (
    <section className="space-y-6">
      <div className="app-card">
        <div className="app-card-header">
          <div>
            <h2 className="enterprise-heading text-2xl font-semibold">
              Variance & Shrink
            </h2>
            <p className="app-card-subtitle">
              Weekly variance flags by inventory item.
            </p>
          </div>
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
                Connect your POS and complete inventory counts to surface
                variance signals.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--enterprise-border)]">
              <table className="app-table w-full text-left text-sm">
                <thead className="text-xs uppercase text-[var(--enterprise-muted)]">
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
                      <td className="px-3 py-2">
                        {flag.expected_remaining_oz}
                      </td>
                      <td className="px-3 py-2">{flag.actual_remaining_oz}</td>
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

      {graphsEnabled ? (
        <div className="app-card">
          <div className="app-card-header">
            <div>
              <h3 className="app-card-title">Variance Charts</h3>
              <p className="app-card-subtitle">
                Trend over time and item-level variance distribution.
              </p>
            </div>
          </div>
          <div className="app-card-body">
            {loading ? (
              <p className="text-sm text-[var(--enterprise-muted)]">
                Loading variance charts…
              </p>
            ) : flags.length === 0 ? (
              <div className="app-empty">
                <div className="app-empty-title">No Variance Flags Yet</div>
                <p className="app-empty-desc">
                  Connect your POS and complete inventory counts to surface variance signals.
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--enterprise-ink)]">
                    Abs variance (oz) by week
                  </div>
                  <div className="mt-2">
                    <LineChart
                      series={[
                        {
                          name: "Abs variance (oz)",
                          color: "var(--enterprise-accent)",
                          data: (() => {
                            const map = new Map<string, number>();
                            for (const row of flags) {
                              const prev = map.get(row.week_start_date) ?? 0;
                              const v = Number.parseFloat(row.variance_oz);
                              map.set(
                                row.week_start_date,
                                prev + (Number.isNaN(v) ? 0 : Math.abs(v)),
                              );
                            }
                            return Array.from(map.entries())
                              .map(([week, total]) => ({
                                x: new Date(week).getTime(),
                                y: total,
                                label: new Date(week).toLocaleDateString(),
                              }))
                              .sort((a, b) => a.x - b.x);
                          })(),
                        },
                      ]}
                      valueFormat={(v) => `${v.toFixed(1)} oz`}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--enterprise-ink)]">
                    Variance % by item (top)
                  </div>
                  <div className="mt-2">
                    <BarChart
                      data={[...flags]
                        .sort(
                          (a, b) =>
                            Math.abs(Number.parseFloat(b.variance_pct)) -
                            Math.abs(Number.parseFloat(a.variance_pct)),
                        )
                        .slice(0, 10)
                        .map((row) => ({
                          label: row.item_name,
                          value: Number.parseFloat(row.variance_pct) || 0,
                          color: "var(--enterprise-accent)",
                        }))}
                      valueFormat={(v) => `${v.toFixed(1)}%`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!aiTopEnabled && aiEnabled ? (
        <AiCard
          title="AI Variance Explanation"
          subtitle="Possible causes and recommended checks."
          loading={aiLoading}
          error={!aiExplain ? "No variance explanation available yet." : null}
        >
          <div className="space-y-4 text-sm">
            <p className="text-[var(--enterprise-muted)]">
              {aiExplain?.non_accusatory_note}
            </p>
            <div className="space-y-3">
              {aiExplain?.findings.map((finding) => (
                <div
                  key={`${finding.item}-${finding.severity}`}
                  className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{finding.item}</div>
                    <span className="app-pill">{finding.severity}</span>
                  </div>
                  <p className="text-xs text-[var(--enterprise-muted)]">
                    Variance: {finding.variance_pct.toFixed(1)}%
                  </p>
                  {finding.hypotheses.length ? (
                    <div className="mt-2">
                      <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                        Possible causes
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-[var(--enterprise-muted)]">
                        {finding.hypotheses.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {finding.recommended_checks.length ? (
                    <div className="mt-2">
                      <div className="text-xs uppercase text-[var(--enterprise-muted)]">
                        Recommended checks
                      </div>
                      <ul className="mt-1 list-disc pl-4 text-[var(--enterprise-muted)]">
                        {finding.recommended_checks.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </AiCard>
      ) : null}
    </section>
  );
}
