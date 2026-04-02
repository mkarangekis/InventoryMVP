"use client";

import { useState, useRef, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Message = {
  role: "user" | "assistant";
  content: string;
  inputHash?: string;
  promptVersion?: string;
  voted?: 1 | -1;
};

const SUGGESTED = [
  "Which items have the most shrinkage this week?",
  "What's our revenue trend vs last week?",
  "Which vendor has the most pending orders?",
  "What are the top 3 items to reorder?",
  "Show me high-severity variance flags",
];

const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export function AskYourData({ locationId }: { locationId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/v1/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, locationId }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }]);
      } else {
        const payload = (await res.json()) as { answer: string; inputHash?: string; promptVersion?: string };
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: payload.answer,
            inputHash: payload.inputHash,
            promptVersion: payload.promptVersion,
          },
        ]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
    }
    setLoading(false);
  };

  const submitFeedback = async (msgIdx: number, rating: 1 | -1) => {
    const msg = messages[msgIdx];
    if (!msg || msg.voted || !msg.inputHash) return;
    setMessages((prev) => prev.map((m, i) => i === msgIdx ? { ...m, voted: rating } : m));
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
          feature: "ask-your-data",
          inputHash: msg.inputHash,
          promptVersion: msg.promptVersion ?? "2026-04-02",
          rating,
        }),
      });
    } catch {}
  };

  return (
    <div className="app-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">Ask Your Data</h3>
          <p className="app-card-subtitle">Natural language queries about your bar operations.</p>
        </div>
        <span className="app-pill">AI</span>
      </div>

      {/* Messages */}
      <div
        className="app-card-body"
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: 360,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 8,
        }}
      >
        {messages.length === 0 ? (
          <div>
            <p style={{ fontSize: 12, color: "var(--enterprise-muted)", marginBottom: 10 }}>
              Ask anything about variance, inventory, orders, or revenue:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={loading}
                  onClick={() => void submit(s)}
                  style={{
                    background: "var(--app-surface-elevated)",
                    border: "1px solid var(--enterprise-border)",
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 11,
                    color: "var(--enterprise-fg)",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--enterprise-accent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--enterprise-border)")}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  background: msg.role === "user"
                    ? "var(--enterprise-accent)"
                    : "var(--app-surface-elevated)",
                  border: msg.role === "assistant" ? "1px solid var(--enterprise-border)" : "none",
                  color: msg.role === "user" ? "#0f0e0c" : "var(--enterprise-fg)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.inputHash && (
                <div style={{ display: "flex", gap: 4, marginTop: 4, marginLeft: 2 }}>
                  <button
                    type="button"
                    onClick={() => void submitFeedback(i, 1)}
                    disabled={!!msg.voted}
                    style={{
                      background: msg.voted === 1 ? "rgba(34,197,94,0.15)" : "transparent",
                      border: "1px solid",
                      borderColor: msg.voted === 1 ? "#22c55e" : "var(--enterprise-border)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontSize: 11,
                      cursor: msg.voted ? "default" : "pointer",
                      color: msg.voted === 1 ? "#22c55e" : "var(--enterprise-muted)",
                    }}
                  >👍</button>
                  <button
                    type="button"
                    onClick={() => void submitFeedback(i, -1)}
                    disabled={!!msg.voted}
                    style={{
                      background: msg.voted === -1 ? "rgba(239,68,68,0.15)" : "transparent",
                      border: "1px solid",
                      borderColor: msg.voted === -1 ? "#ef4444" : "var(--enterprise-border)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      fontSize: 11,
                      cursor: msg.voted ? "default" : "pointer",
                      color: msg.voted === -1 ? "#ef4444" : "var(--enterprise-muted)",
                    }}
                  >👎</button>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: "var(--enterprise-accent)",
              animation: "pulse 1s infinite",
            }} />
            <span style={{ fontSize: 12, color: "var(--enterprise-muted)" }}>Thinking...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        borderTop: "1px solid var(--enterprise-border)",
        padding: "12px 20px",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(input); } }}
          placeholder="Ask about variance, orders, inventory..."
          disabled={loading}
          style={{
            flex: 1,
            background: "var(--app-surface-elevated)",
            border: "1px solid var(--enterprise-border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            color: "var(--enterprise-fg)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={() => void submit(input)}
          disabled={loading || !input.trim()}
          style={{
            background: "var(--enterprise-accent)",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
            color: "#0f0e0c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
