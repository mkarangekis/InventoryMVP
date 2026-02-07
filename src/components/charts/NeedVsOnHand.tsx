"use client";

import { useState } from "react";

export type NeedVsOnHandDatum = {
  label: string;
  onHandOz: number;
  forecastOz: number;
};

type NeedVsOnHandProps = {
  data: NeedVsOnHandDatum[];
};

const fmt = (v: number) => `${v.toFixed(0)} oz`;

export function NeedVsOnHand({ data }: NeedVsOnHandProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-[var(--enterprise-muted)]">No data.</p>;
  }

  const max = Math.max(
    1,
    ...data.flatMap((d) => [d.onHandOz, d.forecastOz]),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--enterprise-muted)]">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--enterprise-accent)" }}
          />
          Forecast (14d)
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "rgba(212, 168, 83, 0.25)" }}
          />
          On-hand
        </span>
      </div>

      <div className="space-y-2">
        {data.map((d, idx) => {
          const onHandPct = Math.min(100, (d.onHandOz / max) * 100);
          const forecastPct = Math.min(100, (d.forecastOz / max) * 100);
          const isHover = hover === idx;
          const risk =
            d.forecastOz > 0 && d.onHandOz <= d.forecastOz ? "high" : "med";

          return (
            <div
              key={`${d.label}-${idx}`}
              className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-3"
              onMouseEnter={() => setHover(idx)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--enterprise-ink)]">
                    {d.label}
                  </div>
                  <div className="mt-1 text-xs text-[var(--enterprise-muted)]">
                    On-hand {fmt(d.onHandOz)} | Forecast {fmt(d.forecastOz)}
                  </div>
                </div>
                <span className="app-pill">{risk}</span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="h-2 w-full rounded-full bg-[var(--app-surface-elevated)]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${onHandPct}%`,
                      background: "rgba(212, 168, 83, 0.25)",
                    }}
                  />
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--app-surface-elevated)]">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${forecastPct}%`,
                      background: "var(--enterprise-accent)",
                      opacity: isHover ? 1 : 0.9,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

