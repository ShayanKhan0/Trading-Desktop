import { requireUser } from "@/lib/auth";
import { getTaxonomy, getTrades, parseFilters } from "@/lib/queries";
import { resolveRange } from "@/lib/date-range";
import { computeCoreMetrics, groupByDay, groupByMonth } from "@/lib/metrics";
import { formatCurrency, formatMonth, formatPercent, formatR, formatRatio } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filters/filter-bar";
import { PnlCalendar } from "@/components/pnl-calendar";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { StatCard, toneOf } from "@/components/stat-card";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const [trades, taxonomy] = await Promise.all([
    getTrades(user.id, filters),
    getTaxonomy(user.id),
  ]);

  const currency = user.currency;
  const range = resolveRange(filters.range, filters.from, filters.to);
  const daily = groupByDay(trades);
  const monthly = groupByMonth(trades);
  const m = computeCoreMetrics(trades);

  const greenDays = daily.filter((d) => d.netPnl > 0);
  const redDays = daily.filter((d) => d.netPnl < 0);
  const bestDay = daily.reduce<(typeof daily)[number] | null>(
    (best, day) => (!best || day.netPnl > best.netPnl ? day : best),
    null,
  );
  const worstDay = daily.reduce<(typeof daily)[number] | null>(
    (worst, day) => (!worst || day.netPnl < worst.netPnl ? day : worst),
    null,
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description={`${range.label} · ${daily.length} trading days`}
      >
        <FilterBar taxonomy={taxonomy} />
      </PageHeader>

      <div className="space-y-4 p-4 sm:p-6">
        {trades.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Trading days" value={daily.length} size="sm" />
              <StatCard label="Green days" value={greenDays.length} tone="up" size="sm" />
              <StatCard label="Red days" value={redDays.length} tone="down" size="sm" />
              <StatCard
                label="Day win rate"
                value={formatPercent(daily.length ? (greenDays.length / daily.length) * 100 : 0)}
                size="sm"
              />
              <StatCard
                label="Best day"
                value={bestDay ? formatCurrency(bestDay.netPnl, currency) : "—"}
                tone="up"
                hint={bestDay?.date}
                size="sm"
              />
              <StatCard
                label="Worst day"
                value={worstDay ? formatCurrency(worstDay.netPnl, currency) : "—"}
                tone="down"
                hint={worstDay?.date}
                size="sm"
              />
            </div>

            <Card className="overflow-hidden">
              <CardHeader
                title="P&L calendar"
                subtitle="Each cell shows net P&L, trade count and win rate — click to open that day"
              />
              <PnlCalendar days={daily} currency={currency} />
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
              <Card className="overflow-hidden">
                <CardHeader title="Monthly performance" />
                <div className="overflow-x-auto">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b border-line">
                        {["Month", "Trades", "Win rate", "Net P&L", "Avg R", "Total R", "Profit factor"].map(
                          (header, index) => (
                            <th
                              key={header}
                              className={cn(
                                "table-head px-3 py-2 first:pl-5 last:pr-5",
                                index > 0 && "text-right",
                              )}
                            >
                              {header}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.map((month) => (
                        <tr key={month.month} className="border-b border-line-soft last:border-0">
                          <td className="px-3 py-2.5 pl-5 text-xs font-medium">
                            {formatMonth(month.month)}
                          </td>
                          <td className="num px-3 py-2.5 text-right text-xs">{month.trades}</td>
                          <td className="num px-3 py-2.5 text-right text-xs">
                            {formatPercent(month.winRate)}
                          </td>
                          <td
                            className={cn(
                              "num px-3 py-2.5 text-right text-xs font-semibold",
                              month.netPnl > 0
                                ? "text-emerald-400"
                                : month.netPnl < 0
                                  ? "text-rose-400"
                                  : "text-ink-muted",
                            )}
                          >
                            {formatCurrency(month.netPnl, currency)}
                          </td>
                          <td className="num px-3 py-2.5 text-right text-xs">{formatR(month.avgR)}</td>
                          <td className="num px-3 py-2.5 text-right text-xs">{formatR(month.totalR)}</td>
                          <td className="num px-3 py-2.5 pr-5 text-right text-xs">
                            {formatRatio(month.profitFactor)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader title="Net P&L by month" />
                <BreakdownBarChart
                  rows={monthly.map((month) => ({
                    key: month.month,
                    label: formatMonth(month.month),
                    trades: month.trades,
                    netPnl: month.netPnl,
                    winRate: month.winRate,
                    avgR: month.avgR,
                  }))}
                  metric="netPnl"
                  currency={currency}
                  layout="horizontal"
                  height={320}
                />
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatCard label="Net P&L" value={formatCurrency(m.netPnl, currency)} tone={toneOf(m.netPnl)} size="sm" />
              <StatCard label="Avg per day" value={formatCurrency(daily.length ? m.netPnl / daily.length : 0, currency)} size="sm" />
              <StatCard label="Avg trades / day" value={(daily.length ? m.totalTrades / daily.length : 0).toFixed(1)} size="sm" />
              <StatCard label="Total R" value={formatR(m.totalR)} tone={toneOf(m.totalR)} size="sm" />
            </div>
          </>
        ) : (
          <Card>
            <EmptyState
              title="No trades in this range"
              description="Pick a wider date range to populate the calendar."
            />
          </Card>
        )}
      </div>
    </>
  );
}
