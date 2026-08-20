import { requireUser } from "@/lib/auth";
import { getTaxonomy, getTrades, parseFilters } from "@/lib/queries";
import { resolveRange } from "@/lib/date-range";
import {
  breakdownByDayOfWeek,
  breakdownByEmotion,
  breakdownByHour,
  breakdownByInstrument,
  breakdownByMarketCondition,
  breakdownByConfluence,
  breakdownByConfluenceCount,
  breakdownByMistake,
  breakdownByPlanAdherence,
  breakdownByScoreBand,
  breakdownBySession,
  breakdownBySetup,
  breakdownByStrategy,
  breakdownByTag,
  computeCoreMetrics,
  durationBuckets,
  histogram,
} from "@/lib/metrics";
import {
  formatCurrency,
  formatDuration,
  formatPercent,
  formatR,
  formatRatio,
  formatSignedCurrency,
} from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filters/filter-bar";
import { ExportButton } from "@/components/export-button";
import { StatCard, toneOf } from "@/components/stat-card";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { BreakdownTable } from "@/components/breakdown-table";
import { PsychologyPanel } from "@/components/psychology-panel";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const filters = parseFilters(params);

  const [trades, taxonomy] = await Promise.all([
    getTrades(user.id, filters),
    getTaxonomy(user.id),
  ]);

  const currency = user.currency;
  const range = resolveRange(filters.range, filters.from, filters.to);
  const m = computeCoreMetrics(trades, Number(user.startingBalance));

  if (!trades.length) {
    return (
      <>
        <PageHeader title="Analytics" description={range.label}>
          <FilterBar taxonomy={taxonomy} />
        </PageHeader>
        <div className="p-4 sm:p-6">
          <Card>
            <EmptyState
              title="No trades in this range"
              description="Widen the date range or clear a filter to see your analytics."
            />
          </Card>
        </div>
      </>
    );
  }

  const setups = breakdownBySetup(trades);
  const strategies = breakdownByStrategy(trades);
  const instruments = breakdownByInstrument(trades);
  const sessions = breakdownBySession(trades);
  const hours = breakdownByHour(trades);
  const weekdays = breakdownByDayOfWeek(trades);
  const tags = breakdownByTag(trades);
  const mistakes = breakdownByMistake(trades, trades.length);
  const confluences = breakdownByConfluence(trades, trades.length);
  const confluenceCounts = breakdownByConfluenceCount(trades);
  const conditions = breakdownByMarketCondition(trades);
  const emotions = breakdownByEmotion(trades);

  const winners = trades.filter((t) => t.result === "WIN").map((t) => t.netPnl);
  const losers = trades.filter((t) => t.result === "LOSS").map((t) => t.netPnl);
  const rValues = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
  const durations = durationBuckets(trades);

  const mistakeCost = mistakes.reduce((total, row) => total + Math.min(0, row.netPnl), 0);

  // Does stacking more reasons actually help? Compare a thin book against a thick one.
  const thin = trades.filter((t) => t.confluences.length > 0 && t.confluences.length <= 2);
  const thick = trades.filter((t) => t.confluences.length >= 4);
  const rateOf = (rows: typeof trades) => {
    const decided = rows.filter((t) => t.result !== "BREAKEVEN");
    return decided.length ? (rows.filter((t) => t.result === "WIN").length / decided.length) * 100 : 0;
  };
  const confluenceLift =
    thin.length >= 5 && thick.length >= 5 ? rateOf(thick) - rateOf(thin) : null;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`${range.label} · ${m.totalTrades} trades analysed`}
        actions={<ExportButton />}
      >
        <FilterBar taxonomy={taxonomy} />
      </PageHeader>

      <div className="space-y-6 p-4 sm:p-6">
        {/* Core metrics */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Core metrics</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <StatCard label="Total trades" value={m.totalTrades} size="sm" />
            <StatCard label="Winners" value={m.winningTrades} tone="up" size="sm" />
            <StatCard label="Losers" value={m.losingTrades} tone="down" size="sm" />
            <StatCard label="Breakeven" value={m.breakevenTrades} size="sm" />
            <StatCard label="Win rate" value={formatPercent(m.winRate)} size="sm" />
            <StatCard label="Loss rate" value={formatPercent(m.lossRate)} size="sm" />
            <StatCard
              label="Net P&L"
              value={formatSignedCurrency(m.netPnl, currency)}
              tone={toneOf(m.netPnl)}
              size="sm"
            />
            <StatCard
              label="Profit factor"
              value={formatRatio(m.profitFactor)}
              tone={m.profitFactor >= 1 ? "up" : "down"}
              size="sm"
            />
            <StatCard
              label="Expectancy"
              value={formatSignedCurrency(m.expectancy, currency)}
              tone={toneOf(m.expectancy)}
              size="sm"
            />
            <StatCard
              label="Avg trade"
              value={formatSignedCurrency(m.avgTrade, currency)}
              tone={toneOf(m.avgTrade)}
              size="sm"
            />
            <StatCard label="Avg winner" value={formatCurrency(m.avgWin, currency)} tone="up" size="sm" />
            <StatCard label="Avg loser" value={formatCurrency(m.avgLoss, currency)} tone="down" size="sm" />
            <StatCard label="Largest winner" value={formatCurrency(m.largestWin, currency)} tone="up" size="sm" />
            <StatCard label="Largest loser" value={formatCurrency(m.largestLoss, currency)} tone="down" size="sm" />
            <StatCard
              label="Max drawdown"
              value={formatCurrency(-m.maxDrawdown, currency)}
              tone="down"
              size="sm"
            />
            <StatCard label="Max consec. wins" value={m.maxWinStreak} size="sm" />
            <StatCard label="Max consec. losses" value={m.maxLossStreak} size="sm" />
            <StatCard label="Avg holding time" value={formatDuration(m.avgHoldingMs)} size="sm" />
          </div>
        </section>

        {/* Risk metrics */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Risk metrics</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            <StatCard label="Avg risk / trade" value={formatCurrency(m.avgRisk, currency)} size="sm" />
            <StatCard label="Avg R multiple" value={formatR(m.avgR)} tone={toneOf(m.avgR)} size="sm" />
            <StatCard label="Total R" value={formatR(m.totalR)} tone={toneOf(m.totalR)} size="sm" />
            <StatCard label="Best R" value={formatR(m.bestR)} tone="up" size="sm" />
            <StatCard label="Worst R" value={formatR(m.worstR)} tone="down" size="sm" />
            <StatCard
              label="Current drawdown"
              value={formatCurrency(-m.currentDrawdown, currency)}
              tone={m.currentDrawdown > 0 ? "down" : "neutral"}
              size="sm"
            />
            <StatCard
              label="Drawdown %"
              value={formatPercent(m.maxDrawdownPercent)}
              tone="down"
              hint="Peak to trough"
              size="sm"
            />
            <StatCard
              label="Risk consistency"
              value={formatPercent(m.riskConsistency, 0)}
              hint="Higher means more uniform sizing"
              size="sm"
            />
          </div>
        </section>

        {/* Drawdown */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Drawdown analysis"
            subtitle={`Max drawdown ${formatCurrency(m.maxDrawdown, currency)} (${formatPercent(m.maxDrawdownPercent)}) · longest ${formatDuration(m.maxDrawdownDurationMs)} · recovery ${m.recoveryMs !== null ? formatDuration(m.recoveryMs) : "—"}`}
          />
          <DrawdownChart data={m.drawdownCurve} currency={currency} />
        </Card>

        {/* Distributions */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Distributions</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="overflow-hidden">
              <CardHeader title="R-multiple distribution" subtitle={`${rValues.length} trades with a defined stop`} />
              <DistributionChart data={histogram(rValues, 14)} unit="R" />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Winning trade distribution" subtitle={`${winners.length} winners`} />
              <DistributionChart data={histogram(winners, 12)} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Losing trade distribution" subtitle={`${losers.length} losers`} />
              <DistributionChart data={histogram(losers, 12)} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="P&L distribution" subtitle="All trades" />
              <DistributionChart data={histogram(trades.map((t) => t.netPnl), 16)} />
            </Card>
            <Card className="overflow-hidden lg:col-span-2">
              <CardHeader title="Trade duration" subtitle="Where your holding times cluster and how they perform" />
              <BreakdownBarChart
                rows={durations.map((d) => ({
                  key: d.key,
                  label: d.label,
                  trades: d.count,
                  netPnl: d.netPnl,
                  winRate: d.winRate,
                  avgR: d.avgR,
                }))}
                metric="netPnl"
                currency={currency}
                layout="horizontal"
                height={250}
              />
            </Card>
          </div>
        </section>

        {/* Time of day */}
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Performance by time</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="overflow-hidden">
              <CardHeader title="Net P&L by hour of entry" subtitle="UTC" />
              <BreakdownBarChart rows={hours} metric="netPnl" currency={currency} layout="horizontal" height={260} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Net P&L by session" />
              <BreakdownBarChart rows={sessions} metric="netPnl" currency={currency} height={260} />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="Win rate by day of week" />
              <BreakdownBarChart rows={weekdays} metric="winRate" currency={currency} height={260} />
            </Card>
          </div>
        </section>

        {/* Breakdown tables */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold tracking-tight">Performance breakdowns</h2>

          <Card className="overflow-hidden">
            <CardHeader title="By setup" subtitle="Sort any column to compare setups directly" />
            <BreakdownTable rows={setups} currency={currency} />
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="By instrument" />
            <BreakdownTable rows={instruments} currency={currency} />
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader title="By strategy" />
              <BreakdownTable rows={strategies} currency={currency} compact />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="By session" />
              <BreakdownTable rows={sessions} currency={currency} compact />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="By tag" />
              <BreakdownTable rows={tags} currency={currency} compact />
            </Card>
            <Card className="overflow-hidden">
              <CardHeader title="By market condition" />
              <BreakdownTable rows={conditions} currency={currency} compact />
            </Card>
          </div>
        </section>

        {/* Psychology */}
        <PsychologyPanel
          confidence={breakdownByScoreBand(trades, "confidenceBefore")}
          setupQuality={breakdownByScoreBand(trades, "setupQuality")}
          execution={breakdownByScoreBand(trades, "executionQuality")}
          discipline={breakdownByScoreBand(trades, "disciplineScore")}
          planAdherence={breakdownByPlanAdherence(trades)}
          emotions={emotions}
          currency={currency}
        />

        {/* Confluences */}
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Confluence analysis</h2>
            {confluenceLift !== null ? (
              <p className="text-xs text-ink-faint">
                Four or more confluences win{" "}
                <span
                  className={`num font-semibold ${confluenceLift >= 0 ? "text-up" : "text-down"}`}
                >
                  {confluenceLift >= 0 ? "+" : ""}
                  {confluenceLift.toFixed(1)}pp
                </span>{" "}
                more often than one or two
              </p>
            ) : null}
          </div>

          {confluences.length ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
              <Card className="overflow-hidden">
                <CardHeader
                  title="Win rate by confluence count"
                  subtitle="Does waiting for more reasons pay?"
                />
                <BreakdownBarChart
                  rows={confluenceCounts}
                  metric="winRate"
                  currency={currency}
                  height={280}
                />
              </Card>
              <Card className="overflow-hidden">
                <CardHeader
                  title="Performance by confluence"
                  subtitle="Every trade where each reason was present"
                />
                <BreakdownTable rows={confluences} currency={currency} showShare />
              </Card>
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No confluences logged in this period"
                description="Tick the reasons that justified each entry on the trade form, then come back to see which ones actually carry the edge."
              />
            </Card>
          )}
        </section>

        {/* Mistakes */}
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Mistake analysis</h2>
            <p className="text-xs text-ink-faint">
              Trades carrying a mistake lost{" "}
              <span className="num font-semibold text-down">
                {formatCurrency(mistakeCost, currency)}
              </span>{" "}
              in aggregate
            </p>
          </div>

          {mistakes.length ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
              <Card className="overflow-hidden">
                <CardHeader title="Cost by mistake" subtitle="Net P&L on trades where each mistake occurred" />
                <BreakdownBarChart rows={mistakes} metric="netPnl" currency={currency} height={280} />
              </Card>
              <Card className="overflow-hidden">
                <CardHeader title="Mistake frequency &amp; impact" />
                <BreakdownTable rows={mistakes} currency={currency} showShare />
              </Card>
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No mistakes logged in this period"
                description="Tag mistakes on the trade form to see what each habit costs you."
              />
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
