import Link from "next/link";
import type { TradeRecord } from "@/lib/types";
import { formatDate, formatR, formatSignedCurrency, formatTime } from "@/lib/format";
import { Badge } from "@/components/ui/primitives";

export function RecentTrades({
  trades,
  currency = "USD",
}: {
  trades: TradeRecord[];
  currency?: string;
}) {
  if (!trades.length) {
    return <p className="px-5 py-10 text-center text-xs text-ink-faint">No trades yet</p>;
  }

  return (
    <ul className="divide-y divide-line-soft">
      {trades.map((trade) => (
        <li key={trade.id}>
          <Link
            href={`/trades/${trade.id}`}
            className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{trade.symbol}</span>
                <Badge tone={trade.direction === "LONG" ? "accent" : "warn"}>
                  {trade.direction === "LONG" ? "Long" : "Short"}
                </Badge>
                {trade.setupName ? (
                  <span className="truncate text-xs text-ink-faint">{trade.setupName}</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {formatDate(trade.tradeDate)} · {formatTime(trade.entryTime)}
                {trade.sessionName ? ` · ${trade.sessionName}` : ""}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p
                className={`num text-sm font-semibold ${
                  trade.netPnl > 0
                    ? "text-up"
                    : trade.netPnl < 0
                      ? "text-down"
                      : "text-ink-muted"
                }`}
              >
                {formatSignedCurrency(trade.netPnl, currency)}
              </p>
              <p className="num text-[11px] text-ink-faint">{formatR(trade.rMultiple)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
