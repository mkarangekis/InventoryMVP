"use client";

import { ReactNode, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type AiCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  footer?: ReactNode;
  // Feedback props — optional; omit to disable
  feedbackFeature?: string;
  feedbackInputHash?: string;
  feedbackPromptVersion?: string;
};

export function AiCard({
  title,
  subtitle,
  children,
  loading,
  error,
  footer,
  feedbackFeature,
  feedbackInputHash,
  feedbackPromptVersion,
}: AiCardProps) {
  const [vote, setVote] = useState<1 | -1 | null>(null);
  const [sending, setSending] = useState(false);

  const submitFeedback = async (rating: 1 | -1) => {
    if (vote !== null || !feedbackFeature || !feedbackInputHash || !feedbackPromptVersion) return;
    setSending(true);
    setVote(rating);
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      await fetch("/api/v1/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          feature: feedbackFeature,
          inputHash: feedbackInputHash,
          promptVersion: feedbackPromptVersion,
          rating,
        }),
      });
    } catch {}
    setSending(false);
  };

  const feedbackEnabled = !!(feedbackFeature && feedbackInputHash && feedbackPromptVersion);

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">{title}</h3>
          {subtitle ? <p className="app-card-subtitle">{subtitle}</p> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {feedbackEnabled && !loading && !error && (
            <div style={{ display: "flex", gap: 4 }}>
              <button
                type="button"
                disabled={vote !== null || sending}
                onClick={() => void submitFeedback(1)}
                title="Helpful"
                style={{
                  background: vote === 1 ? "rgba(34,197,94,0.15)" : "transparent",
                  border: "1px solid",
                  borderColor: vote === 1 ? "#22c55e" : "var(--enterprise-border)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  cursor: vote !== null ? "default" : "pointer",
                  fontSize: 12,
                  lineHeight: 1.2,
                  color: vote === 1 ? "#22c55e" : "var(--enterprise-muted)",
                  transition: "all 0.15s",
                }}
              >
                👍
              </button>
              <button
                type="button"
                disabled={vote !== null || sending}
                onClick={() => void submitFeedback(-1)}
                title="Not helpful"
                style={{
                  background: vote === -1 ? "rgba(239,68,68,0.15)" : "transparent",
                  border: "1px solid",
                  borderColor: vote === -1 ? "#ef4444" : "var(--enterprise-border)",
                  borderRadius: 6,
                  padding: "2px 6px",
                  cursor: vote !== null ? "default" : "pointer",
                  fontSize: 12,
                  lineHeight: 1.2,
                  color: vote === -1 ? "#ef4444" : "var(--enterprise-muted)",
                  transition: "all 0.15s",
                }}
              >
                👎
              </button>
            </div>
          )}
          <span className="app-pill">AI</span>
        </div>
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
