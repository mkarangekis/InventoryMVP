"use client";

import { ReactNode } from "react";

type AiCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  footer?: ReactNode;
};

export function AiCard({ title, subtitle, children, loading, error, footer }: AiCardProps) {
  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">{title}</h3>
          {subtitle ? <p className="app-card-subtitle">{subtitle}</p> : null}
        </div>
        <span className="app-pill">AI</span>
      </div>
      <div className="app-card-body">
        {loading ? (
          <p className="text-sm text-[var(--enterprise-muted)]">Loading AI insights...</p>
        ) : error ? (
          <div className="app-empty">
            <div className="app-empty-title">AI insight unavailable</div>
            <p className="app-empty-desc">{error}</p>
          </div>
        ) : (
          children
        )}
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}
