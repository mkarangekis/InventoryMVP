"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { ShrinkageCluster } from "@/app/api/v1/ai/shrinkage-cluster/route";

const TYPE_COLORS: Record<string, string> = {
  pour_variance: "#f59e0b",
  theft_pattern: "#ef4444",
  waste: "#a78bfa",
  data_quality: "#3b82f6",
  over_spec: "#06b6d4",
  other: "var(--enterprise-muted)",
};

const TYPE_LABELS: Record<string, string> = {
  pour_variance: "Pour Variance",
  theft_pattern: "Theft Pattern",
  waste: "Waste",
  data_quality: "Data Quality",
  over_spec: "Over-Spec",
  other: "Other",
};

const URGENCY_COLOR: Record<string, string> = {
  high: "#ef4444",
  med: "#f59e0b",
  low: "#22c55e",
};

export function ShrinkageClusterWidget({ locationId }: { locationId?: string }) {
  const [clusters, setClusters] = useState<ShrinkageCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setLoading(false); return; }

      const params = locationId ? `?locationId=${locationId}` : "";
      const res = await fetch(`/api/v1/ai/shrinkage-cluster${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setError(await res.text());
      } else {
        const payload = (await res.json()) as { clusters: ShrinkageCluster[]; message?: string };
        setClusters(payload.clusters ?? []);
      }
      setLoading(false);
    };
    void load();
  }, [locationId]);

  const totalShrinkage = clusters.reduce((s, c) => s + (c.total_shrinkage_usd ?? 0), 0);

  return (
    <div className="app-card">
      <div className="app-card-header">
        <div>
          <h3 className="app-card-title">Shrinkage Clusters</h3>
          <p className="app-card-subtitle">AI-grouped loss patterns from last 4 weeks of variance flags.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalShrinkage > 0 && (
            <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
              ${totalShrinkage.toFixed(0)} est. loss
            </span>
          )}
          <span className="app-pill">AI</span>
        </div>
      </div>
      <div className="app-card-body">
        {loading ? (
          <p style={{ fontSize: 13, color: "var(--enterprise-muted)" }}>Analyzing shrinkage patterns...</p>
        ) : error ? (
          <div className="app-empty">
            <div className="app-empty-title">Could not load clusters</div>
            <p className="app-empty-desc">{error}</p>
          </div>
        ) : clusters.length === 0 ? (
          <div className="app-empty">
            <div className="app-empty-title">No patterns detected</div>
            <p className="app-empty-desc">Not enough variance history to cluster. Run counts for 2+ weeks.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {clusters.map((c) => (
              <div
                key={c.cluster_id}
                style={{
                  border: "1px solid var(--enterprise-border)",
                  borderLeft: `3px solid ${TYPE_COLORS[c.type] ?? "var(--enterprise-accent)"}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  cursor: "pointer",
                }}
                onClick={() => setExpanded((e) => e === c.cluster_id ? null : c.cluster_id)}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  background: "var(--app-surface-elevated)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: TYPE_COLORS[c.type] ?? "var(--enterprise-muted)",
                      background: (TYPE_COLORS[c.type] ?? "#888") + "22",
                      borderRadius: 4,
                      padding: "2px 6px",
                    }}>
                      {TYPE_LABELS[c.type] ?? c.type}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: "var(--enterprise-fg)" }}>
                      {c.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {c.total_shrinkage_usd !== null && c.total_shrinkage_usd > 0 && (
                      <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                        ${c.total_shrinkage_usd.toFixed(0)}
                      </span>
                    )}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: URGENCY_COLOR[c.urgency] ?? "var(--enterprise-muted)",
                      textTransform: "uppercase",
                    }}>
                      {c.urgency}
                    </span>
                    <span style={{ color: "var(--enterprise-muted)", fontSize: 12 }}>
                      {expanded === c.cluster_id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {expanded === c.cluster_id && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid var(--enterprise-border)" }}>
                    <p style={{ fontSize: 12, color: "var(--enterprise-fg)", marginBottom: 8 }}>
                      {c.description}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                      {c.items.map((item) => (
                        <span key={item} style={{
                          background: "var(--app-surface)",
                          border: "1px solid var(--enterprise-border)",
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 11,
                          color: "var(--enterprise-fg)",
                        }}>{item}</span>
                      ))}
                    </div>
                    <div style={{
                      background: "rgba(212,168,83,0.08)",
                      border: "1px solid rgba(212,168,83,0.2)",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--enterprise-accent)",
                    }}>
                      <strong>Action:</strong> {c.recommended_action}
                    </div>
                    {c.avg_z_score !== null && (
                      <p style={{ fontSize: 11, color: "var(--enterprise-muted)", marginTop: 6 }}>
                        Avg Z-score: {c.avg_z_score.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
