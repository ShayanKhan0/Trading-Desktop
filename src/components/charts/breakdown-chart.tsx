"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ACCENT, AXIS, DOWN, GRID, TooltipShell, UP } from "./chart-kit";
import { formatCurrency, formatPercent, formatR, formatSignedCurrency } from "@/lib/format";

export type BreakdownRow = {
  key: string;
  label: string;
  trades: number;
  netPnl: number;
  winRate: number;
  avgR: number;
};

/** Horizontal bars are used wherever labels are text (setups, instruments, tags). */
export function BreakdownBarChart({
  rows,
  metric = "netPnl",
  currency = "USD",
  height = 280,
  layout = "vertical",
}: {
  rows: BreakdownRow[];
  metric?: "netPnl" | "winRate" | "avgR" | "trades";
  currency?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
}) {
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-xs text-ink-faint" style={{ height }}>
        No data for the current filters
      </div>
    );
  }

  // Vertical bars need ~26px per row or the category labels collide.
  const resolvedHeight = layout === "vertical" ? Math.max(height, rows.length * 26 + 30) : height;

  const tickFormat = (value: number) =>
    metric === "netPnl"
      ? formatCurrency(value, currency, true)
      : metric === "winRate"
        ? `${value.toFixed(0)}%`
        : metric === "avgR"
          ? `${value.toFixed(1)}R`
          : String(value);

  const barColor = (row: BreakdownRow) => {
    if (metric === "netPnl") return row.netPnl >= 0 ? UP : DOWN;
    if (metric === "avgR") return row.avgR >= 0 ? UP : DOWN;
    if (metric === "winRate") return row.winRate >= 50 ? UP : DOWN;
    return ACCENT;
  };

  const tooltip = (
    <Tooltip
      cursor={{ fill: "rgba(154,101,55,0.06)" }}
      content={({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const row = payload[0].payload as BreakdownRow;
        return (
          <TooltipShell
            label={row.label}
            rows={[
              {
                label: "Net P&L",
                value: formatSignedCurrency(row.netPnl, currency),
                tone: row.netPnl >= 0 ? "text-up" : "text-down",
              },
              { label: "Win rate", value: formatPercent(row.winRate) },
              { label: "Avg R", value: formatR(row.avgR) },
              { label: "Trades", value: row.trades },
            ]}
          />
        );
      }}
    />
  );

  return (
    <div className="px-2 pb-4" style={{ height: resolvedHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        {layout === "vertical" ? (
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid {...GRID} vertical horizontal={false} />
            <XAxis type="number" {...AXIS} tickFormatter={tickFormat} />
            <YAxis type="category" dataKey="label" {...AXIS} width={128} interval={0} />
            {tooltip}
            <Bar dataKey={metric} radius={[0, 3, 3, 0]} isAnimationActive={false} barSize={16}>
              {rows.map((row) => (
                <Cell key={row.key} fill={barColor(row)} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={rows} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} interval={0} angle={rows.length > 8 ? -35 : 0} textAnchor={rows.length > 8 ? "end" : "middle"} height={rows.length > 8 ? 58 : 30} />
            <YAxis {...AXIS} tickFormatter={tickFormat} width={58} />
            {tooltip}
            <Bar dataKey={metric} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.key} fill={barColor(row)} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
