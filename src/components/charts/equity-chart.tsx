"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ACCENT, AXIS, DOWN, GRID, TooltipShell, UP } from "./chart-kit";
import { formatCurrency, formatDate, formatR, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Point = {
  index: number;
  date: string;
  time: string;
  symbol: string;
  pnl: number;
  cumulativePnl: number;
  balance: number;
  cumulativeR: number;
};

type Mode = "cumulative" | "balance" | "r" | "daily";

const MODES: { value: Mode; label: string }[] = [
  { value: "cumulative", label: "Cumulative P&L" },
  { value: "balance", label: "Account balance" },
  { value: "r", label: "Cumulative R" },
  { value: "daily", label: "Daily P&L" },
];

export function EquityChart({
  points,
  daily,
  currency = "USD",
  height = 300,
}: {
  points: Point[];
  daily: { date: string; netPnl: number; trades: number }[];
  currency?: string;
  height?: number;
}) {
  const [mode, setMode] = useState<Mode>("cumulative");

  const positive = useMemo(() => {
    if (!points.length) return true;
    return points[points.length - 1].cumulativePnl >= 0;
  }, [points]);

  const stroke = positive ? UP : DOWN;

  return (
    <div>
      <div className="flex flex-wrap gap-1 px-5 pb-3">
        {MODES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              mode === option.value
                ? "bg-accent/15 text-accent"
                : "text-ink-faint hover:bg-surface-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="px-2 pb-4" style={{ height }}>
        {mode === "daily" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="date"
                {...AXIS}
                tickFormatter={(value: string) => formatDate(value, { month: "short", day: "numeric", year: undefined })}
                minTickGap={24}
              />
              <YAxis {...AXIS} tickFormatter={(v: number) => formatCurrency(v, currency, true)} width={62} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as { date: string; netPnl: number; trades: number };
                  return (
                    <TooltipShell
                      label={formatDate(row.date)}
                      rows={[
                        {
                          label: "Net P&L",
                          value: formatSignedCurrency(row.netPnl, currency),
                          tone: row.netPnl >= 0 ? "text-emerald-400" : "text-rose-400",
                        },
                        { label: "Trades", value: row.trades },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="netPnl" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {daily.map((row) => (
                  <Cell key={row.date} fill={row.netPnl >= 0 ? UP : DOWN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : mode === "r" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="index" {...AXIS} minTickGap={28} />
              <YAxis {...AXIS} tickFormatter={(v: number) => `${v.toFixed(0)}R`} width={52} />
              <Tooltip content={<EquityTooltip mode={mode} currency={currency} />} />
              <Line
                type="monotone"
                dataKey="cumulativeR"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="index" {...AXIS} minTickGap={28} />
              <YAxis
                {...AXIS}
                domain={mode === "balance" ? ["auto", "auto"] : ["auto", "auto"]}
                tickFormatter={(v: number) => formatCurrency(v, currency, true)}
                width={62}
              />
              <Tooltip content={<EquityTooltip mode={mode} currency={currency} />} />
              <Area
                type="monotone"
                dataKey={mode === "balance" ? "balance" : "cumulativePnl"}
                stroke={stroke}
                strokeWidth={2}
                fill="url(#equityFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EquityTooltip({
  active,
  payload,
  mode,
  currency,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  mode: Mode;
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (!point.time) return null;

  return (
    <TooltipShell
      label={`${point.symbol || "Start"} · ${formatDate(point.time)}`}
      rows={[
        mode === "balance"
          ? { label: "Balance", value: formatCurrency(point.balance, currency) }
          : mode === "r"
            ? { label: "Cumulative R", value: formatR(point.cumulativeR) }
            : {
                label: "Cumulative P&L",
                value: formatSignedCurrency(point.cumulativePnl, currency),
                tone: point.cumulativePnl >= 0 ? "text-emerald-400" : "text-rose-400",
              },
        {
          label: "Trade P&L",
          value: formatSignedCurrency(point.pnl, currency),
          tone: point.pnl >= 0 ? "text-emerald-400" : "text-rose-400",
        },
        { label: "Trade #", value: point.index },
      ]}
    />
  );
}
