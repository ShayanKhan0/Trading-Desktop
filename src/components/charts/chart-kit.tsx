"use client";

import type { TooltipProps } from "recharts";

export const AXIS = {
  stroke: "#8b7a67",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

export const GRID = {
  stroke: "#f1eae0",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

export const UP = "#157f52";
export const DOWN = "#c0334a";
export const ACCENT = "#9a6537";
export const NEUTRAL = "#8b7a67";

/**
 * Fixed categorical order for a white chart surface. Validated for colour-vision
 * deficiency: every adjacent pair clears the CVD separation floor, all eight sit
 * inside the lightness band, and each holds 3:1 against white. Assign in order —
 * never cycle, never regenerate.
 */
export const CATEGORICAL = [
  "#a85f22",
  "#0f6fa3",
  "#7a8c3a",
  "#9a3f72",
  "#c1732e",
  "#4c5ba8",
  "#12876a",
  "#6b4fbf",
];

export function TooltipShell({
  label,
  rows,
}: {
  label?: React.ReactNode;
  rows: { label: string; value: React.ReactNode; tone?: string }[];
}) {
  return (
    <div className="rounded-lg border border-line-strong bg-canvas/97 px-3 py-2 shadow-lg backdrop-blur">
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
