"use client";

import { useMemo, useRef, useState } from "react";

type Point = {
  x: number;
  y: number;
  label?: string;
};

export type LineSeries = {
  name: string;
  color: string;
  data: Point[];
};

type LineChartProps = {
  series: LineSeries[];
  height?: number;
  yLabel?: string;
  valueFormat?: (v: number) => string;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function LineChart({
  series,
  height = 220,
  yLabel,
  valueFormat,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{
    xPx: number;
    seriesName: string;
    point: Point;
  } | null>(null);

  const activeSeries = useMemo(
    () => series.filter((s) => !hidden[s.name]),
    [hidden, series],
  );

  const allPoints = useMemo(
    () => activeSeries.flatMap((s) => s.data),
    [activeSeries],
  );

  const domain = useMemo(() => {
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const minX = xs.length ? Math.min(...xs) : 0;
    const maxX = xs.length ? Math.max(...xs) : 1;
    const minY = 0; // always start y-axis at 0 for readability
    const rawMax = ys.length ? Math.max(...ys) : 1;
    const maxY = rawMax === 0 ? 1 : rawMax * 1.1; // 10% headroom
    return {
      minX,
      maxX: maxX === minX ? minX + 1 : maxX,
      minY,
      maxY,
    };
  }, [allPoints]);

  const w = 900;
  const h = height;
  const pad = { l: 48, r: 20, t: 12, b: 30 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const xToPx = (x: number) =>
    pad.l + ((x - domain.minX) / (domain.maxX - domain.minX)) * plotW;
  const yToPx = (y: number) =>
    pad.t + (1 - (y - domain.minY) / (domain.maxY - domain.minY)) * plotH;

  const yTicks = useMemo(() => {
    const ticks = 4;
    const out: number[] = [];
    for (let i = 0; i <= ticks; i += 1) {
      out.push(domain.minY + ((domain.maxY - domain.minY) * i) / ticks);
    }
    return out;
  }, [domain.maxY, domain.minY]);

  const fmt = valueFormat ?? ((v: number) => v.toFixed(1));

  // Smooth bezier path
  const buildSmoothPath = (pts: Point[]) => {
    if (pts.length === 0) return "";
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    if (sorted.length === 1) {
      const x = xToPx(sorted[0].x);
      const y = yToPx(sorted[0].y);
      return `M ${x} ${y}`;
    }
    const parts: string[] = [];
    sorted.forEach((p, idx) => {
      const x = xToPx(p.x);
      const y = yToPx(p.y);
      if (idx === 0) {
        parts.push(`M ${x.toFixed(2)} ${y.toFixed(2)}`);
      } else {
        const prev = sorted[idx - 1];
        const px = xToPx(prev.x);
        const py = yToPx(prev.y);
        const cpX = (px + x) / 2;
        parts.push(`C ${cpX.toFixed(2)} ${py.toFixed(2)}, ${cpX.toFixed(2)} ${y.toFixed(2)}, ${x.toFixed(2)} ${y.toFixed(2)}`);
      }
    });
    return parts.join(" ");
  };

  // Gradient fill area path
  const buildAreaPath = (pts: Point[], color: string) => {
    if (pts.length === 0) return { path: "", gradId: "" };
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    const linePath = buildSmoothPath(sorted);
    const lastX = xToPx(sorted[sorted.length - 1].x);
    const firstX = xToPx(sorted[0].x);
    const baseline = yToPx(domain.minY);
    const areaPath = `${linePath} L ${lastX.toFixed(2)} ${baseline.toFixed(2)} L ${firstX.toFixed(2)} ${baseline.toFixed(2)} Z`;
    const gradId = `lineGrad-${color.replace(/[^a-z0-9]/gi, "")}`;
    return { path: areaPath, gradId };
  };

  const nearestPoint = (xPx: number) => {
    let best: { seriesName: string; point: Point; dist: number } | null = null;
    for (const s of activeSeries) {
      for (const p of s.data) {
        const px = xToPx(p.x);
        const d = Math.abs(px - xPx);
        if (!best || d < best.dist) best = { seriesName: s.name, point: p, dist: d };
      }
    }
    return best;
  };

  const handleMove = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const xPx = (x / rect.width) * w;
    const best = nearestPoint(xPx);
    if (!best) { setHover(null); return; }
    setHover({ xPx, seriesName: best.seriesName, point: best.point });
  };

  if (series.length === 0) {
    return <div className="text-sm text-[var(--enterprise-muted)]">No data.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Legend */}
      {series.length > 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {series.map((s) => {
            const isOff = Boolean(hidden[s.name]);
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setHidden((prev) => ({ ...prev, [s.name]: !prev[s.name] }))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "3px 10px",
                  borderRadius: 20,
                  border: "1px solid",
                  borderColor: isOff ? "#2a3240" : s.color,
                  background: isOff ? "transparent" : `${s.color}18`,
                  color: isOff ? "#8b949e" : "#f0f6fc",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, opacity: isOff ? 0.3 : 1, flexShrink: 0 }} />
                {s.name}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={containerRef}
        style={{ position: "relative" }}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseLeave={() => setHover(null)}
        onTouchMove={(e) => handleMove(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Line chart">
          <defs>
            {activeSeries.map((s) => {
              const gradId = `lineGrad-${s.color.replace(/[^a-z0-9]/gi, "")}`;
              return (
                <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                  <stop offset="85%" stopColor={s.color} stopOpacity="0.03" />
                </linearGradient>
              );
            })}
          </defs>

          <rect x="0" y="0" width={w} height={h} fill="transparent" />

          {/* Y-axis grid lines */}
          {yTicks.map((t) => {
            const y = yToPx(t);
            return (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#1f2732" strokeWidth="1" />
                <text x={pad.l - 8} y={y + 4} fontSize="11" textAnchor="end" fill="#8b949e">
                  {fmt(t)}
                </text>
              </g>
            );
          })}

          {yLabel && (
            <text x={pad.l} y={pad.t + 10} fontSize="11" fill="#8b949e">{yLabel}</text>
          )}

          {/* X-axis baseline */}
          <line x1={pad.l} x2={w - pad.r} y1={yToPx(domain.minY)} y2={yToPx(domain.minY)} stroke="#2a3240" strokeWidth="1" />

          {/* Gradient area fills */}
          {activeSeries.map((s) => {
            const { path, gradId } = buildAreaPath(s.data, s.color);
            return (
              <path key={`area-${s.name}`} d={path} fill={`url(#${gradId})`} />
            );
          })}

          {/* Smooth lines */}
          {activeSeries.map((s) => (
            <path
              key={`line-${s.name}`}
              d={buildSmoothPath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Hover crosshair + dot */}
          {hover && (
            <g>
              <line
                x1={hover.xPx} x2={hover.xPx}
                y1={pad.t} y2={h - pad.b}
                stroke="#d4a853" strokeOpacity="0.4" strokeDasharray="4 3"
              />
              {activeSeries.map((s) => {
                const pt = [...s.data].sort((a, b) => a.x - b.x).find((p) => p === hover.point);
                if (!pt) return null;
                return (
                  <circle
                    key={`dot-${s.name}`}
                    cx={xToPx(hover.point.x)} cy={yToPx(hover.point.y)}
                    r="5" fill={s.color}
                    stroke="#0b1016" strokeWidth="2"
                  />
                );
              })}
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div
            style={{
              position: "absolute",
              top: 8,
              left: `${clamp((hover.xPx / w) * 100, 2, 85)}%`,
              pointerEvents: "none",
              background: "#141a22",
              border: "1px solid #2a3240",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "#f0f6fc",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ color: "#8b949e", fontSize: 11 }}>
              {hover.point.label ?? new Date(hover.point.x).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div style={{ fontWeight: 700, color: "#d4a853", marginTop: 2 }}>{fmt(hover.point.y)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
