"use client";

import { useMemo, useRef, useState } from "react";

type Point = {
  x: number; // domain value (e.g. time ms)
  y: number; // metric value
  label?: string; // display label
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
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : 1;
    return {
      minX,
      maxX: maxX === minX ? minX + 1 : maxX,
      minY,
      maxY: maxY === minY ? minY + 1 : maxY,
    };
  }, [allPoints]);

  const w = 900;
  const h = height;
  const pad = { l: 44, r: 18, t: 10, b: 26 };
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

  const buildPath = (pts: Point[]) => {
    if (pts.length === 0) return "";
    const sorted = [...pts].sort((a, b) => a.x - b.x);
    const parts: string[] = [];
    sorted.forEach((p, idx) => {
      const x = xToPx(p.x);
      const y = yToPx(p.y);
      parts.push(`${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
    });
    return parts.join(" ");
  };

  const nearestPoint = (xPx: number) => {
    let best:
      | { seriesName: string; point: Point; dist: number }
      | null = null;
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
    if (!best) {
      setHover(null);
      return;
    }
    setHover({ xPx, seriesName: best.seriesName, point: best.point });
  };

  if (series.length === 0) {
    return (
      <div className="text-sm text-[var(--enterprise-muted)]">No data.</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {series.map((s) => {
          const isOff = Boolean(hidden[s.name]);
          return (
            <button
              key={s.name}
              className={
                isOff
                  ? "rounded-full border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-3 py-1 text-[var(--enterprise-muted)]"
                  : "rounded-full border border-[var(--enterprise-border)] bg-[var(--enterprise-accent-soft)] px-3 py-1 font-semibold text-[var(--enterprise-ink)]"
              }
              onClick={() =>
                setHidden((prev) => ({ ...prev, [s.name]: !prev[s.name] }))
              }
              type="button"
            >
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{ background: s.color, opacity: isOff ? 0.35 : 1 }}
              />
              {s.name}
            </button>
          );
        })}
      </div>

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
          aria-label="Line chart"
        >
          <rect x="0" y="0" width={w} height={h} fill="transparent" />

          {/* grid + y axis labels */}
          {yTicks.map((t) => {
            const y = yToPx(t);
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
                  {fmt(t)}
                </text>
              </g>
            );
          })}

          {yLabel ? (
            <text
              x={pad.l}
              y={pad.t + 10}
              fontSize="11"
              fill="var(--enterprise-muted)"
            >
              {yLabel}
            </text>
          ) : null}

          {/* series */}
          {activeSeries.map((s) => (
            <path
              key={s.name}
              d={buildPath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* hover marker */}
          {hover ? (
            <g>
              <line
                x1={hover.xPx}
                x2={hover.xPx}
                y1={pad.t}
                y2={h - pad.b}
                stroke="var(--enterprise-accent)"
                strokeOpacity={0.5}
              />
              <circle
                cx={xToPx(hover.point.x)}
                cy={yToPx(hover.point.y)}
                r="5"
                fill="var(--enterprise-accent)"
              />
            </g>
          ) : null}
        </svg>

        {hover ? (
          <div
            className="pointer-events-none absolute top-2 rounded-lg border border-[var(--enterprise-border)] bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--enterprise-ink)] shadow"
            style={{
              left: `${clamp((hover.xPx / w) * 100, 0, 92)}%`,
            }}
          >
            <div className="font-semibold">{hover.seriesName}</div>
            <div className="text-[var(--enterprise-muted)]">
              {hover.point.label ?? new Date(hover.point.x).toLocaleDateString()}
            </div>
            <div className="mt-1">{fmt(hover.point.y)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

