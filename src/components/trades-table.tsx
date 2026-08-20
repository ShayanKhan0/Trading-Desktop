"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from "lucide-react";
import { useState, useTransition } from "react";
import type { TradeRecord } from "@/lib/types";
import { formatDate, formatNumber, formatR, formatSignedCurrency, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const COLUMNS: { key: string; label: string; align?: "right"; sortable?: boolean }[] = [
  { key: "tradeDate", label: "Date", sortable: true },
  { key: "symbol", label: "Instrument", sortable: true },
  { key: "direction", label: "Side", sortable: true },
  { key: "entryPrice", label: "Entry", align: "right", sortable: true },
  { key: "exitPrice", label: "Exit", align: "right", sortable: true },
  { key: "positionSize", label: "Size", align: "right", sortable: true },
  { key: "stopLoss", label: "Stop", align: "right" },
  { key: "takeProfit", label: "Target", align: "right" },
  { key: "netPnl", label: "Net P&L", align: "right", sortable: true },
  { key: "pnlPercent", label: "P&L %", align: "right", sortable: true },
  { key: "riskAmount", label: "Risk", align: "right", sortable: true },
  { key: "rMultiple", label: "R", align: "right", sortable: true },
  { key: "setup", label: "Setup" },
  { key: "session", label: "Session" },
  { key: "result", label: "Result", sortable: true },
  { key: "tags", label: "Tags" },
];

export function TradesTable({
  trades,
  total,
  page,
  pageSize,
  sortBy,
  sortDir,
  currency = "USD",
}: {
  trades: TradeRecord[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDir: "asc" | "desc";
  currency?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const navigate = (mutate: (sp: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const toggleSort = (key: string) => {
    navigate((sp) => {
      if (sortBy === key) {
        sp.set("sortDir", sortDir === "desc" ? "asc" : "desc");
      } else {
        sp.set("sortBy", key);
        sp.set("sortDir", "desc");
      }
      sp.delete("page");
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate((sp) => {
              if (search) sp.set("search", search);
              else sp.delete("search");
              sp.delete("page");
            });
          }}
          className="relative"
        >
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol or notes…"
            className="field w-64 py-1.5 pl-8 text-xs"
          />
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-faint">
          <span>
            {total.toLocaleString()} trade{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || pending}
              onClick={() => navigate((sp) => sp.set("page", String(page - 1)))}
              className="rounded-md p-1 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="num px-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || pending}
              onClick={() => navigate((sp) => sp.set("page", String(page + 1)))}
              className="rounded-md p-1 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {trades.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-line">
                {COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "table-head whitespace-nowrap px-3 py-2.5 first:pl-5 last:pr-5",
                      column.align === "right" && "text-right",
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-ink",
                          sortBy === column.key && "text-accent",
                        )}
                      >
                        {column.label}
                        {sortBy === column.key ? (
                          sortDir === "desc" ? (
                            <ArrowDown size={11} />
                          ) : (
                            <ArrowUp size={11} />
                          )
                        ) : (
                          <ChevronsUpDown size={11} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.id}
                  className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 pl-5">
                    <Link href={`/trades/${trade.id}`} className="block">
                      <span className="block text-xs">{formatDate(trade.tradeDate)}</span>
                      <span className="block text-[10px] text-ink-faint">
                        {formatTime(trade.entryTime)}
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Link href={`/trades/${trade.id}`} className="inline-flex items-center gap-1.5 font-medium">
                      {trade.symbol}
                      {trade.isDemo ? <span className="chip text-[9px]">Demo</span> : null}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Badge tone={trade.direction === "LONG" ? "accent" : "warn"}>
                      {trade.direction === "LONG" ? "Long" : "Short"}
                    </Badge>
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs">
                    {formatPrice(trade.entryPrice)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs">
                    {trade.exitPrice !== null ? formatPrice(trade.exitPrice) : "—"}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs">
                    {formatNumber(trade.positionSize, trade.positionSize % 1 === 0 ? 0 : 2)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-muted">
                    {trade.stopLoss !== null ? formatPrice(trade.stopLoss) : "—"}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-muted">
                    {trade.takeProfit !== null ? formatPrice(trade.takeProfit) : "—"}
                  </td>
                  <td
                    className={cn(
                      "num whitespace-nowrap px-3 py-2.5 text-right font-semibold",
                      trade.netPnl > 0
                        ? "text-emerald-400"
                        : trade.netPnl < 0
                          ? "text-rose-400"
                          : "text-ink-muted",
                    )}
                  >
                    {formatSignedCurrency(trade.netPnl, currency)}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-muted">
                    {trade.pnlPercent !== null ? `${trade.pnlPercent.toFixed(2)}%` : "—"}
                  </td>
                  <td className="num whitespace-nowrap px-3 py-2.5 text-right text-xs text-ink-muted">
                    {trade.riskAmount !== null ? formatSignedCurrency(trade.riskAmount, currency) : "—"}
                  </td>
                  <td
                    className={cn(
                      "num whitespace-nowrap px-3 py-2.5 text-right text-xs font-medium",
                      (trade.rMultiple ?? 0) > 0
                        ? "text-emerald-400"
                        : (trade.rMultiple ?? 0) < 0
                          ? "text-rose-400"
                          : "text-ink-muted",
                    )}
                  >
                    {formatR(trade.rMultiple)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">
                    {trade.setupName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-muted">
                    {trade.sessionName ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <Badge
                      tone={
                        trade.result === "WIN" ? "up" : trade.result === "LOSS" ? "down" : "neutral"
                      }
                    >
                      {trade.result === "BREAKEVEN" ? "BE" : trade.result === "WIN" ? "Win" : "Loss"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 pr-5">
                    <div className="flex gap-1">
                      {trade.tags.slice(0, 2).map((tag) => (
                        <span key={tag.id} className="chip">
                          {tag.name}
                        </span>
                      ))}
                      {trade.tags.length > 2 ? (
                        <span className="chip">+{trade.tags.length - 2}</span>
                      ) : null}
                      {!trade.tags.length ? <span className="text-xs text-ink-faint">—</span> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-5 py-14 text-center text-sm text-ink-faint">
          No trades match the current filters
        </p>
      )}
    </div>
  );
}

const formatPrice = (value: number) =>
  Math.abs(value) < 10 ? value.toFixed(5) : value.toFixed(2);
