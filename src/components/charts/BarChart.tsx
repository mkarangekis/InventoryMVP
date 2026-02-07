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
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export function BarChart({ data, height = 260, valueFormat }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ idx: number; xPx: number } | null>(null);

  const w = 900;
  const h = height;
  const pad = { l: 44, r: 16, t: 10, b: 80 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const maxV = Math.max(1, ...data.map((d) => d.value));
  const barGap = 8;
  const barW =
    data.length > 0 ? (plotW - barGap * (data.length - 1)) / data.length : 1;

  const fmt = valueFormat ?? ((v: number) => v.toFixed(0));

  const handleMove = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const xPx = (x / rect.width) * w;
    const rel = xPx - pad.l;
    if (rel < 0 || rel > plotW) {
      setHover(null);
      return;
    }
    const idx = clamp(
      Math.floor(rel / (barW + barGap)),
      0,
      Math.max(0, data.length - 1),
    );
    setHover({ idx, xPx });
  };

  if (data.length === 0) {
    return (
      <div className="text-sm text-[var(--enterprise-muted)]">No data.</div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseLeave={() => setHover(null)}
      onTouchMove={(e) => handleMove(e.touches[0]?.clientX ?? 0)}
      onTouchEnd={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        role="img"
        aria-label="Bar chart"
      >
        <rect x="0" y="0" width={w} height={h} fill="transparent" />

        {/* y axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.t + (1 - t) * plotH;
          const v = t * maxV;
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={w - pad.r}
                y1={y}
                y2={y}
                stroke="var(--enterprise-border)"
                strokeOpacity={0.6}
              />
              <text
                x={pad.l - 8}
                y={y + 4}
                fontSize="11"
                textAnchor="end"
                fill="var(--enterprise-muted)"
              >
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, idx) => {
          const x = pad.l + idx * (barW + barGap);
          const barH = (d.value / maxV) * plotH;
          const y = pad.t + (plotH - barH);
          const isHover = hover?.idx === idx;
          const color = d.color ?? "var(--enterprise-accent)";
          return (
            <g key={`${d.label}-${idx}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={10}
                fill={color}
                opacity={isHover ? 1 : 0.85}
              />
              <text
                x={x + barW / 2}
                y={h - pad.b + 18}
                fontSize="11"
                textAnchor="middle"
                fill="var(--enterprise-muted)"
                transform={`rotate(35 ${x + barW / 2} ${h - pad.b + 18})`}
              >
                {d.label.length > 18 ? `${d.label.slice(0, 18)}…` : d.label}
              </text>
            </g>
          );
        })}

        {hover ? (
          <rect
            x={pad.l + hover.idx * (barW + barGap)}
            y={pad.t}
            width={barW}
            height={plotH}
            fill="var(--enterprise-accent)"
            opacity={0.08}
            rx={10}
          />
        ) : null}
      </svg>

      {hover ? (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--enterprise-ink)] shadow"
          style={{
            left: `${clamp((hover.xPx / w) * 100, 0, 92)}%`,
          }}
        >
          <div className="font-semibold">{data[hover.idx]?.label}</div>
          <div className="mt-1">{fmt(data[hover.idx]?.value ?? 0)}</div>
        </div>
      ) : null}
    </div>
  );
}

