import Link from "next/link";
import { ArrowUpRight, PlusCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getTaxonomy, getTrades, parseFilters } from "@/lib/queries";
import { resolveRange } from "@/lib/date-range";
import {
  breakdownByDayOfWeek,
  breakdownByDirection,
  breakdownByInstrument,
  breakdownBySession,
  breakdownBySetup,
  buildEquityCurve,
  computeCoreMetrics,
  groupByDay,
} from "@/lib/metrics";
import {
  formatCurrency,
  formatDuration,
  formatPercent,
  formatR,
  formatRatio,
  formatSignedCurrency,
} from "@/lib/format";
import { FilterBar } from "@/components/filters/filter-bar";
import { PageHeader } from "@/components/page-header";
import { StatCard, toneOf } from "@/components/stat-card";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { EquityChart } from "@/components/charts/equity-chart";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { PnlCalendar } from "@/components/pnl-calendar";
import { RecentTrades } from "@/components/recent-trades";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { DemoDataButton } from "@/components/demo-data-button";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const [trades, taxonomy] = await Promise.all([
    getTrades(user.id, filters),
    getTaxonomy(user.id),
  ]);

  const currency = user.currency;
  const startingBalance = Number(user.startingBalance);
  const range = resolveRange(filters.range, filters.from, filters.to);

  const metrics = computeCoreMetrics(trades, startingBalance);
  const equity = buildEquityCurve(trades, startingBalance);
  const daily = groupByDay(trades);
  const setups = breakdownBySetup(trades);
  const instruments = breakdownByInstrument(trades);
  const sessions = breakdownBySession(trades);
  const directions = breakdownByDirection(trades);
  const weekdays = breakdownByDayOfWeek(trades);

  const enabled = (user.dashboardLayout as { hidden?: string[] } | null)?.hidden ?? [];
  const isVisible = (id: string) => !enabled.includes(id);

  if (!trades.length) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description={`${range.label} · no trades in this range`}
          actions={
            <Link href="/trades/new" className="btn btn-primary">
              <PlusCircle size={15} /> Add trade
            </Link>
          }
        >
          <FilterBar taxonomy={taxonomy} />
        </PageHeader>

        <div className="p-4 sm:p-6">
          <Card>
            <EmptyState
              title="Nothing logged for this period yet"
              description="Add your first trade, or load six months of demo data to explore every chart and report in the app."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/trades/new" className="btn btn-primary">
                    <PlusCircle size={15} /> Add your first trade
                  </Link>
                  <DemoDataButton />
                </div>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${range.label} · ${metrics.totalTrades} trades`}
        actions={
          <>
            <DashboardWidgets hidden={enabled} />
            <Link href="/trades/new" className="btn btn-primary">
              <PlusCircle size={15} /> Add trade
            </Link>
          </>
        }
      >
        <FilterBar taxonomy={taxonomy} />
      </PageHeader>

      <div className="space-y-4 p-4 sm:p-6">
        {/* Headline KPIs */}
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Net P&L"
            value={formatSignedCurrency(metrics.netPnl, currency)}
            tone={toneOf(metrics.netPnl)}
            size="lg"
            hint={`Gross ${formatSignedCurrency(metrics.grossPnl, currency)} · fees ${formatCurrency(metrics.totalFees, currency)}`}
          />
          <StatCard
            label="Win rate"
            value={formatPercent(metrics.winRate)}
            size="lg"
            hint={`${metrics.winningTrades}W / ${metrics.losingTrades}L / ${metrics.breakevenTrades}BE`}
          />
          <StatCard
            label="Profit factor"
            value={formatRatio(metrics.profitFactor)}
            tone={metrics.profitFactor >= 1 ? "up" : "down"}
            size="lg"
            hint={`Gross profit ${formatCurrency(metrics.grossProfit, currency, true)} vs loss ${formatCurrency(metrics.grossLoss, currency, true)}`}
          />
          <StatCard
            label="Expectancy / trade"
            value={formatSignedCurrency(metrics.expectancy, currency)}
            tone={toneOf(metrics.expectancy)}
            size="lg"
            hint={`Average R ${formatR(metrics.avgR)}`}
          />
        </div>

        {/* Secondary KPIs */}
        <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="Total trades" value={metrics.totalTrades} size="sm" />
          <StatCard
            label="Avg winner"
            value={formatCurrency(metrics.avgWin, currency)}
            tone="up"
            size="sm"
          />
          <StatCard
            label="Avg loser"
            value={formatCurrency(metrics.avgLoss, currency)}
            tone="down"
            size="sm"
          />
          <StatCard
            label="Largest win"
            value={formatCurrency(metrics.largestWin, currency)}
            tone="up"
            size="sm"
          />
          <StatCard
            label="Largest loss"
            value={formatCurrency(metrics.largestLoss, currency)}
            tone="down"
            size="sm"
          />
          <StatCard label="Total R" value={formatR(metrics.totalR)} tone={toneOf(metrics.totalR)} size="sm" />
          <StatCard
            label="Win streak"
            value={metrics.currentWinStreak}
            hint={`Best ${metrics.maxWinStreak}`}
            size="sm"
          />
          <StatCard
            label="Loss streak"
            value={metrics.currentLossStreak}
            hint={`Worst ${metrics.maxLossStreak}`}
            size="sm"
          />
          <StatCard
            label="Max drawdown"
            value={formatCurrency(-metrics.maxDrawdown, currency)}
            tone="down"
            hint={formatPercent(metrics.maxDrawdownPercent)}
            size="sm"
          />
          <StatCard label="Avg hold" value={formatDuration(metrics.avgHoldingMs)} size="sm" />
        </div>

        {isVisible("equity") ? (
          <Card className="overflow-hidden">
            <CardHeader
              title="Equity curve"
              subtitle={`${range.label} · ending balance ${formatCurrency(startingBalance + metrics.netPnl, currency)}`}
            />
            <EquityChart points={equity} daily={daily} currency={currency} />
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          {isVisible("calendar") ? (
            <Card className="overflow-hidden">
              <CardHeader
                title="P&L calendar"
                subtitle="Click a day to open its trades"
                action={
                  <Link
                    href="/calendar"
                    className="flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-accent"
                  >
                    Full calendar <ArrowUpRight size={12} />
                  </Link>
                }
              />
              <PnlCalendar days={daily} currency={currency} compact />
            </Card>
          ) : null}

          {isVisible("setups") ? (
            <Card className="overflow-hidden">
              <CardHeader title="Net P&L by setup" subtitle="Which setups carry the edge" />
              <BreakdownBarChart rows={setups.slice(0, 8)} metric="netPnl" currency={currency} />
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isVisible("instruments") ? (
            <Card className="overflow-hidden">
              <CardHeader title="Net P&L by instrument" />
              <BreakdownBarChart rows={instruments.slice(0, 8)} metric="netPnl" currency={currency} height={250} />
            </Card>
          ) : null}

          {isVisible("winrate") ? (
            <Card className="overflow-hidden">
              <CardHeader title="Win rate by session" subtitle="When you actually perform" />
              <BreakdownBarChart rows={sessions} metric="winRate" currency={currency} height={250} />
            </Card>
          ) : null}

          {isVisible("weekday") ? (
            <Card className="overflow-hidden">
              <CardHeader title="Net P&L by day of week" />
              <BreakdownBarChart
                rows={weekdays}
                metric="netPnl"
                currency={currency}
                height={250}
                layout="horizontal"
              />
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
          {isVisible("direction") ? (
            <Card className="overflow-hidden">
              <CardHeader title="Long vs short" />
              <div className="space-y-2 px-5 pb-5">
                {directions.length ? (
                  directions.map((row) => (
                    <div key={row.key} className="rounded-lg border border-line-soft bg-canvas p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {row.label === "LONG" ? "Long" : "Short"}
                        </span>
                        <span
                          className={`num text-sm font-semibold ${row.netPnl >= 0 ? "text-up" : "text-down"}`}
                        >
                          {formatSignedCurrency(row.netPnl, currency)}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.min(100, row.winRate)}%` }}
                        />
                      </div>
                      <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
                        <span>{formatPercent(row.winRate)} win rate</span>
                        <span>
                          {row.trades} trades · {formatR(row.avgR)} avg
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-xs text-ink-faint">No data</p>
                )}
              </div>
            </Card>
          ) : null}

          {isVisible("recent") ? (
            <Card className="overflow-hidden">
              <CardHeader
                title="Recent trades"
                action={
                  <Link
                    href="/trades"
                    className="flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-accent"
                  >
                    All trades <ArrowUpRight size={12} />
                  </Link>
                }
              />
              <RecentTrades trades={trades.slice(0, 8)} currency={currency} />
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
