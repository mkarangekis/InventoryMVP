"use client";

type ViewToggleProps = {
  value: "charts" | "table";
  onChange: (value: "charts" | "table") => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--enterprise-border)] bg-[var(--app-surface)] p-1 text-xs">
      <button
        className={
          value === "charts"
            ? "rounded-full bg-[var(--enterprise-accent-soft)] px-3 py-1 font-semibold text-[var(--enterprise-ink)]"
            : "rounded-full px-3 py-1 text-[var(--enterprise-muted)]"
        }
        onClick={() => onChange("charts")}
        type="button"
      >
        Charts
      </button>
      <button
        className={
          value === "table"
            ? "rounded-full bg-[var(--enterprise-accent-soft)] px-3 py-1 font-semibold text-[var(--enterprise-ink)]"
            : "rounded-full px-3 py-1 text-[var(--enterprise-muted)]"
        }
        onClick={() => onChange("table")}
        type="button"
      >
        Table
      </button>
    </div>
  );
}

