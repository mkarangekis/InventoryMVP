"use client";

import { useRef, useState } from "react";

export type BarDatum = {
  label: string;
  value: number;
  color?: string;
};

type BarChartProps = {
  data: BarDatum[];
  height?: number;
  valueFormat?: (v: number) => string;
  /** "horizontal" renders label-bar-value rows — best for named item breakdowns */
  variant?: "vertical" | "horizontal";
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function HorizontalBarChart({
  data,
  valueFormat,
}: {
  data: BarDatum[];
  valueFormat: (v: number) => string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const maxV = Math.max(1, ...data.map((d) => d.value));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => {
        const pct = (d.value / maxV) * 100;
        const color = d.color ?? "#d4a853";
        const isHover = hoveredIdx === i;
        return (
          <div
            key={`${d.label}-${i}`}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Label */}
            <div style={{
              width: 130,
              flexShrink: 0,
              fontSize: 12,
              color: isHover ? "#f0f6fc" : "#c9d1d9",
              fontWeight: isHover ? 600 : 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              transition: "color 0.15s",
            }}>
              {d.label}
            </div>
            {/* Bar track */}
            <div style={{ flex: 1, height: 8, background: "#1f2732", borderRadius: 4 }}>
              <div style={{
                width: `${pct}%`,
                height: 8,
                borderRadius: 4,
                background: color,
                opacity: isHover ? 1 : 0.75,
                transition: "width 0.4s ease, opacity 0.15s",
              }} />
            </div>
            {/* Value */}
            <div style={{
              width: 72,
              flexShrink: 0,
              textAlign: "right",
              fontSize: 12,
              fontWeight: 600,
              color: isHover ? color : "#9ca3af",
              fontVariantNumeric: "tabular-nums",
              transition: "color 0.15s",
            }}>
              {valueFormat(d.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerticalBarChart({
  data,
  height,
  valueFormat,
}: {
  data: BarDatum[];
  height: number;
  valueFormat: (v: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ idx: number; xPx: number } | null>(null);

  const w = 900;
  const h = height;
  const pad = { l: 48, r: 16, t: 12, b: 72 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const maxV = Math.max(1, ...data.map((d) => d.value));
  const barGap = 10;
  const barW = data.length > 0 ? (plotW - barGap * (data.length - 1)) / data.length : 1;

  const handleMove = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const xPx = (x / rect.width) * w;
    const rel = xPx - pad.l;
    if (rel < 0 || rel > plotW) { setHover(null); return; }
    const idx = clamp(Math.floor(rel / (barW + barGap)), 0, Math.max(0, data.length - 1));
    setHover({ idx, xPx });
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "relative" }}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={() => setHover(null)}
      onTouchMove={(e) => handleMove(e.touches[0]?.clientX ?? 0)}
      onTouchEnd={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Bar chart">
        <rect x="0" y="0" width={w} height={h} fill="transparent" />

        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + (1 - t) * plotH;
          const v = t * maxV;
          return (
            <g key={t}>
              <line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke="#1f2732" strokeWidth="1" />
              <text x={pad.l - 8} y={y + 4} fontSize="11" textAnchor="end" fill="#8b949e">{valueFormat(v)}</text>
            </g>
          );
        })}

        {/* X baseline */}
        <line x1={pad.l} x2={w - pad.r} y1={pad.t + plotH} y2={pad.t + plotH} stroke="#2a3240" strokeWidth="1" />

        {/* Bars */}
        {data.map((d, idx) => {
          const x = pad.l + idx * (barW + barGap);
          const barH = (d.value / maxV) * plotH;
          const y = pad.t + (plotH - barH);
          const isHover = hover?.idx === idx;
          const color = d.color ?? "#d4a853";
          return (
            <g key={`${d.label}-${idx}`}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} fill={color} opacity={isHover ? 1 : 0.75} />
              <text
                x={x + barW / 2} y={h - pad.b + 16}
                fontSize="11" textAnchor="middle" fill={isHover ? "#f0f6fc" : "#8b949e"}
                transform={`rotate(30 ${x + barW / 2} ${h - pad.b + 16})`}
              >
                {d.label.length > 16 ? `${d.label.slice(0, 16)}…` : d.label}
              </text>
            </g>
          );
        })}

        {hover && (
          <rect
            x={pad.l + hover.idx * (barW + barGap)} y={pad.t}
            width={barW} height={plotH}
            fill="#d4a853" opacity="0.06" rx={6}
          />
        )}
      </svg>

      {hover && (
        <div style={{
          position: "absolute", top: 8,
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
        }}>
          <div style={{ color: "#8b949e", fontSize: 11 }}>{data[hover.idx]?.label}</div>
          <div style={{ fontWeight: 700, color: "#d4a853", marginTop: 2 }}>{valueFormat(data[hover.idx]?.value ?? 0)}</div>
        </div>
      )}
    </div>
  );
}

export function BarChart({ data, height = 260, valueFormat, variant = "vertical" }: BarChartProps) {
  const fmt = valueFormat ?? ((v: number) => v.toFixed(0));

  if (data.length === 0) {
    return <div className="text-sm text-[var(--enterprise-muted)]">No data.</div>;
  }

  if (variant === "horizontal") {
    return <HorizontalBarChart data={data} valueFormat={fmt} />;
  }

  return <VerticalBarChart data={data} height={height} valueFormat={fmt} />;
}
