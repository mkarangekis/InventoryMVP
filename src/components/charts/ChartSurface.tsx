"use client";

import { ReactNode } from "react";

type ChartSurfaceProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
};

export function ChartSurface({ title, subtitle, right, children }: ChartSurfaceProps) {
  return (
    <div className="rounded-2xl border border-[var(--enterprise-border)] bg-[var(--app-surface-elevated)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--enterprise-ink)]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-[var(--enterprise-muted)]">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

