"use client";

import type { Breakdown } from "@/lib/metrics";
import { SortableTable, type Column } from "@/components/data-table";
import { formatCurrency, formatPercent, formatR, formatRatio, formatSignedCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Row = Breakdown & { shareOfTrades?: number };

export function BreakdownTable({
  rows,
  currency = "USD",
  compact = false,
  showShare = false,
}: {
  rows: Row[];
  currency?: string;
  compact?: boolean;
  showShare?: boolean;
}) {
  const pnlClass = (value: number) =>
    value > 0 ? "text-emerald-400" : value < 0 ? "text-rose-400" : "text-ink-muted";

  const columns: Column<Row>[] = [
    {
      key: "label",
      header: "Name",
      sortValue: (row) => row.label,
      render: (row) => <span className="font-medium">{row.label}</span>,
    },
    {
      key: "trades",
      header: "Trades",
      align: "right",
      sortValue: (row) => row.trades,
      render: (row) => <span className="num text-xs">{row.trades}</span>,
    },
    ...(showShare
      ? [
          {
            key: "share",
            header: "% of all",
            align: "right" as const,
            sortValue: (row: Row) => row.shareOfTrades ?? 0,
            render: (row: Row) => (
              <span className="num text-xs text-ink-muted">
                {formatPercent(row.shareOfTrades ?? 0)}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "winRate",
      header: "Win rate",
      align: "right",
      sortValue: (row) => row.winRate,
      render: (row) => (
        <span className={cn("num text-xs", row.winRate >= 50 ? "text-emerald-400" : "text-ink")}>
          {formatPercent(row.winRate)}
        </span>
      ),
    },
    {
      key: "netPnl",
      header: "Net P&L",
      align: "right",
      sortValue: (row) => row.netPnl,
      render: (row) => (
        <span className={cn("num text-xs font-semibold", pnlClass(row.netPnl))}>
          {formatSignedCurrency(row.netPnl, currency)}
        </span>
      ),
    },
    {
      key: "avgPnl",
      header: "Avg P&L",
      align: "right",
      sortValue: (row) => row.avgPnl,
      render: (row) => (
        <span className={cn("num text-xs", pnlClass(row.avgPnl))}>
          {formatSignedCurrency(row.avgPnl, currency)}
        </span>
      ),
    },
    {
      key: "avgR",
      header: "Avg R",
      align: "right",
      sortValue: (row) => row.avgR,
      render: (row) => (
        <span className={cn("num text-xs", pnlClass(row.avgR))}>{formatR(row.avgR)}</span>
      ),
    },
    ...(compact
      ? []
      : [
          {
            key: "totalR",
            header: "Total R",
            align: "right" as const,
            sortValue: (row: Row) => row.totalR,
            render: (row: Row) => (
              <span className={cn("num text-xs", pnlClass(row.totalR))}>{formatR(row.totalR)}</span>
            ),
          },
          {
            key: "profitFactor",
            header: "Profit factor",
            align: "right" as const,
            sortValue: (row: Row) => (Number.isFinite(row.profitFactor) ? row.profitFactor : 999),
            render: (row: Row) => (
              <span
                className={cn("num text-xs", row.profitFactor >= 1 ? "text-emerald-400" : "text-rose-400")}
              >
                {formatRatio(row.profitFactor)}
              </span>
            ),
          },
          {
            key: "expectancy",
            header: "Expectancy",
            align: "right" as const,
            sortValue: (row: Row) => row.expectancy,
            render: (row: Row) => (
              <span className={cn("num text-xs", pnlClass(row.expectancy))}>
                {formatSignedCurrency(row.expectancy, currency)}
              </span>
            ),
          },
          {
            key: "bestTrade",
            header: "Best",
            align: "right" as const,
            sortValue: (row: Row) => row.bestTrade,
            render: (row: Row) => (
              <span className="num text-xs text-emerald-400">
                {formatCurrency(row.bestTrade, currency)}
              </span>
            ),
          },
          {
            key: "worstTrade",
            header: "Worst",
            align: "right" as const,
            sortValue: (row: Row) => row.worstTrade,
            render: (row: Row) => (
              <span className="num text-xs text-rose-400">
                {formatCurrency(row.worstTrade, currency)}
              </span>
            ),
          },
        ]),
  ];

  return (
    <SortableTable
      columns={columns}
      rows={rows}
      initialSort={{ key: "netPnl", dir: "desc" }}
      emptyMessage="Nothing recorded for this breakdown yet"
    />
  );
}
