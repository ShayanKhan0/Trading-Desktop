"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthGrid } from "@/lib/date-range";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type DayStat = {
  date: string;
  netPnl: number;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalR: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PnlCalendar({
  days,
  currency = "USD",
  initialMonth,
  compact = false,
}: {
  days: DayStat[];
  currency?: string;
  initialMonth?: string; // yyyy-MM
  compact?: boolean;
}) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);

  const defaultMonth = useMemo(() => {
    if (initialMonth) return initialMonth;
    if (days.length) return days[days.length - 1].date.slice(0, 7);
    return new Date().toISOString().slice(0, 7);
  }, [days, initialMonth]);

  const [month, setMonth] = useState(defaultMonth);
  const [year, monthIndex] = month.split("-").map(Number);

  const grid = useMemo(() => monthGrid(year, monthIndex - 1), [year, monthIndex]);

  const shift = (delta: number) => {
    const next = new Date(Date.UTC(year, monthIndex - 1 + delta, 1));
    setMonth(next.toISOString().slice(0, 7));
  };

  const monthDays = days.filter((d) => d.date.startsWith(month));
  const monthPnl = monthDays.reduce((total, d) => total + d.netPnl, 0);
  const monthTrades = monthDays.reduce((total, d) => total + d.trades, 0);
  const greenDays = monthDays.filter((d) => d.netPnl > 0).length;
  const redDays = monthDays.filter((d) => d.netPnl < 0).length;

  // Scale colour intensity against the largest absolute day in view.
  const peak = Math.max(1, ...monthDays.map((d) => Math.abs(d.netPnl)));

  // Weekly totals shown in a trailing column.
  const weeks = useMemo(() => {
    const result: { pnl: number; trades: number }[] = [];
    for (let i = 0; i < 6; i += 1) {
      const slice = grid.slice(i * 7, i * 7 + 7);
      let pnl = 0;
      let trades = 0;
      for (const date of slice) {
        const stat = byDate.get(date.toISOString().slice(0, 10));
        if (stat) {
          pnl += stat.netPnl;
          trades += stat.trades;
        }
      }
      result.push({ pnl, trades });
    }
    return result;
  }, [grid, byDate]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 sm:px-5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium">
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "UTC",
              month: "long",
              year: "numeric",
            }).format(new Date(Date.UTC(year, monthIndex - 1, 1)))}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className={monthPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>
            <span className="num font-semibold">{formatCurrency(monthPnl, currency)}</span>
          </span>
          <span className="text-ink-faint">{monthTrades} trades</span>
          <span className="text-ink-faint">
            <span className="text-emerald-400">{greenDays}</span> /{" "}
            <span className="text-rose-400">{redDays}</span> days
          </span>
        </div>
      </div>

      <div className="px-3 pb-4 sm:px-4">
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_auto] gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="pb-1 text-center text-[10px] font-medium text-ink-faint">
              {day}
            </div>
          ))}
          <div className="pb-1 pl-1 text-center text-[10px] font-medium text-ink-faint">Week</div>

          {grid.map((date, index) => {
            const iso = date.toISOString().slice(0, 10);
            const stat = byDate.get(iso);
            const inMonth = date.getUTCMonth() === monthIndex - 1;
            const intensity = stat ? Math.min(0.3, (Math.abs(stat.netPnl) / peak) * 0.28 + 0.05) : 0;
            const positive = (stat?.netPnl ?? 0) > 0;
            const negative = (stat?.netPnl ?? 0) < 0;

            const cell = (
              <div
                className={cn(
                  "flex flex-col justify-between rounded-md border p-1.5 transition-colors",
                  compact ? "min-h-[3.25rem]" : "min-h-[4.5rem]",
                  inMonth ? "border-line-soft" : "border-transparent opacity-35",
                  stat && "hover:border-accent/40",
                )}
                style={
                  stat
                    ? {
                        backgroundColor: positive
                          ? `rgba(52,211,153,${intensity})`
                          : negative
                            ? `rgba(251,113,133,${intensity})`
                            : "transparent",
                        borderColor: positive
                          ? "rgba(52,211,153,0.25)"
                          : negative
                            ? "rgba(251,113,133,0.25)"
                            : undefined,
                      }
                    : undefined
                }
              >
                <span className="text-[10px] text-ink-faint">{date.getUTCDate()}</span>
                {stat ? (
                  <span>
                    <span
                      className={cn(
                        "num block text-[11px] font-semibold leading-tight",
                        positive ? "text-emerald-400" : negative ? "text-rose-400" : "text-ink-muted",
                      )}
                    >
                      {formatCurrency(stat.netPnl, currency, true)}
                    </span>
                    {!compact ? (
                      <span className="block text-[9px] text-ink-faint">
                        {stat.trades}t · {formatPercent(stat.winRate, 0)}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </div>
            );

            return stat ? (
              <Link
                key={iso}
                href={`/trades?range=custom&from=${iso}&to=${iso}`}
                title={`${iso} · ${formatCurrency(stat.netPnl, currency)} · ${stat.trades} trades`}
              >
                {cell}
              </Link>
            ) : (
              <div key={iso}>{cell}</div>
            );
          }).reduce<React.ReactNode[]>((acc, cell, index) => {
            acc.push(cell);
            // Append the week summary after every 7th day cell.
            if ((index + 1) % 7 === 0) {
              const week = weeks[Math.floor(index / 7)];
              acc.push(
                <div
                  key={`week-${index}`}
                  className={cn(
                    "flex min-w-[4.5rem] flex-col justify-center rounded-md border border-line-soft bg-surface-2/40 px-2",
                    compact ? "min-h-[3.25rem]" : "min-h-[4.5rem]",
                  )}
                >
                  <span
                    className={cn(
                      "num text-[11px] font-semibold",
                      week.pnl > 0 ? "text-emerald-400" : week.pnl < 0 ? "text-rose-400" : "text-ink-faint",
                    )}
                  >
                    {week.trades ? formatCurrency(week.pnl, currency, true) : "—"}
                  </span>
                  <span className="text-[9px] text-ink-faint">{week.trades}t</span>
                </div>,
              );
            }
            return acc;
          }, [])}
        </div>
      </div>
    </div>
  );
}
