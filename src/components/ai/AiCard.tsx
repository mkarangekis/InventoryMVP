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
        body: JSON.stringify({ feature: feedbackFeature, inputHash: feedbackInputHash, promptVersion: feedbackPromptVersion, rating }),
      });
    } catch {}
    setSending(false);
  };

  const feedbackEnabled = !!(feedbackFeature && feedbackInputHash && feedbackPromptVersion);

  return (
    <div style={{
      background: "#141a22",
      border: "1px solid #2a3240",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header — gold-tinted */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "14px 20px",
        borderBottom: "1px solid rgba(212,168,83,0.15)",
        background: "rgba(212,168,83,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>🧠</span>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#d4a853", lineHeight: 1.2 }}>{title}</h3>
            {subtitle && <p style={{ fontSize: 11, color: "#8b949e", marginTop: 2 }}>{subtitle}</p>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {feedbackEnabled && !loading && !error && (
            <>
              <button
                type="button"
                disabled={vote !== null || sending}
                onClick={() => void submitFeedback(1)}
                title="Helpful"
                style={{
                  background: vote === 1 ? "rgba(34,197,94,0.15)" : "transparent",
                  border: `1px solid ${vote === 1 ? "#22c55e" : "#2a3240"}`,
                  borderRadius: 6,
                  padding: "3px 7px",
                  cursor: vote !== null ? "default" : "pointer",
                  fontSize: 12,
                  color: vote === 1 ? "#22c55e" : "#8b949e",
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
                  border: `1px solid ${vote === -1 ? "#ef4444" : "#2a3240"}`,
                  borderRadius: 6,
                  padding: "3px 7px",
                  cursor: vote !== null ? "default" : "pointer",
                  fontSize: 12,
                  color: vote === -1 ? "#ef4444" : "#8b949e",
                  transition: "all 0.15s",
                }}
              >
                👎
              </button>
            </>
          )}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            background: "rgba(212,168,83,0.15)",
            color: "#d4a853",
            border: "1px solid rgba(212,168,83,0.3)",
            borderRadius: 4,
            padding: "2px 7px",
          }}>
            AI
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#d4a853", animation: "pulse 1.2s infinite" }} />
            <span style={{ fontSize: 13, color: "#8b949e" }}>Loading AI insights...</span>
          </div>
        ) : error ? (
          <div style={{ padding: "20px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#8b949e", fontStyle: "italic" }}>{error}</p>
          </div>
        ) : (
          children
        )}
        {footer && <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #1f2732" }}>{footer}</div>}
      </div>
    </div>
  );
}
