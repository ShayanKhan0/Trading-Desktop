"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ACCENT, AXIS, DOWN, GRID, TooltipShell, UP } from "./chart-kit";

export function DistributionChart({
  data,
  height = 240,
  colorByValue = true,
  unit = "",
}: {
  data: { label: string; from: number; to: number; count: number }[];
  height?: number;
  colorByValue?: boolean;
  unit?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-xs text-ink-faint" style={{ height }}>
        Not enough data to plot a distribution
      </div>
    );
  }

  return (
    <div className="px-2 pb-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="label" {...AXIS} interval={0} minTickGap={2} />
          <YAxis {...AXIS} allowDecimals={false} width={34} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as { from: number; to: number; count: number };
              return (
                <TooltipShell
                  label={`${row.from.toFixed(2)}${unit} – ${row.to.toFixed(2)}${unit}`}
                  rows={[{ label: "Trades", value: row.count }]}
                />
              );
            }}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((row, index) => (
              <Cell
                key={index}
                fill={colorByValue ? (row.to <= 0 ? DOWN : row.from >= 0 ? UP : ACCENT) : ACCENT}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
