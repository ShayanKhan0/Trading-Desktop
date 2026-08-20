"use client";

import type { TooltipProps } from "recharts";

export const AXIS = {
  stroke: "#64708a",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID = {
  stroke: "#1a1f29",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const UP = "#34d399";
export const DOWN = "#fb7185";
export const ACCENT = "#4f8cff";
export const NEUTRAL = "#64708a";

export const CATEGORICAL = [
  "#4f8cff",
  "#34d399",
  "#f0b429",
  "#a78bfa",
  "#fb7185",
  "#38bdf8",
  "#fb923c",
  "#2dd4bf",
];

export function TooltipShell({
  label,
  rows,
}: {
  label?: React.ReactNode;
  rows: { label: string; value: React.ReactNode; tone?: string }[];
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/95 px-3 py-2 shadow-xl backdrop-blur">
      {label ? <p className="mb-1.5 text-xs font-medium text-ink">{label}</p> : null}
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-6 text-xs">
            <span className="text-ink-faint">{row.label}</span>
            <span className={`num font-medium ${row.tone ?? "text-ink"}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type RechartsTooltipProps = TooltipProps<number, string>;
