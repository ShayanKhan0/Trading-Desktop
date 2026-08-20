"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, DOWN, GRID, TooltipShell } from "./chart-kit";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DrawdownChart({
  data,
  currency = "USD",
  height = 260,
}: {
  data: { date: string; drawdown: number; drawdownPercent: number }[];
  currency?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<"currency" | "percent">("currency");

  if (!data.length) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-xs text-ink-faint" style={{ height }}>
        No drawdown data for the current filters
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 px-5 pb-3">
        {(["currency", "percent"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              mode === option
                ? "bg-accent/15 text-accent"
                : "text-ink-faint hover:bg-surface-2 hover:text-ink",
            )}
          >
            {option === "currency" ? "Currency" : "Percent"}
          </button>
        ))}
      </div>

      <div className="px-2 pb-4" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DOWN} stopOpacity={0.05} />
                <stop offset="100%" stopColor={DOWN} stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="date"
              {...AXIS}
              tickFormatter={(value: string) => formatDate(value, { month: "short", day: "numeric", year: undefined })}
              minTickGap={32}
            />
            <YAxis
              {...AXIS}
              width={62}
              tickFormatter={(v: number) =>
                mode === "currency" ? formatCurrency(v, currency, true) : `${v.toFixed(0)}%`
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as {
                  date: string;
                  drawdown: number;
                  drawdownPercent: number;
                };
                return (
                  <TooltipShell
                    label={formatDate(row.date)}
                    rows={[
                      {
                        label: "Drawdown",
                        value: formatCurrency(row.drawdown, currency),
                        tone: "text-rose-400",
                      },
                      {
                        label: "Percent",
                        value: formatPercent(row.drawdownPercent),
                        tone: "text-rose-400",
                      },
                    ]}
                  />
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={mode === "currency" ? "drawdown" : "drawdownPercent"}
              stroke={DOWN}
              strokeWidth={1.5}
              fill="url(#ddFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
