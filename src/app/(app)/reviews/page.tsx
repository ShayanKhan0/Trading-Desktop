import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrades } from "@/lib/queries";
import { addDays, startOfMonth, startOfWeek, toISODate } from "@/lib/date-range";
import {
  breakdownByDayOfWeek,
  breakdownByInstrument,
  breakdownByMistake,
  breakdownBySetup,
  buildEquityCurve,
  computeCoreMetrics,
  groupByDay,
} from "@/lib/metrics";
import { PageHeader } from "@/components/page-header";
import { ReviewView } from "@/components/review-view";

export const metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const period = single("period") === "MONTHLY" ? "MONTHLY" : "WEEKLY";
  const now = new Date();

  const defaultStart =
    period === "WEEKLY" ? toISODate(startOfWeek(now)) : toISODate(startOfMonth(now));
  const periodStart = single("start") ?? defaultStart;

  const startDate = new Date(`${periodStart}T00:00:00.000Z`);
  const endDate =
    period === "WEEKLY"
      ? addDays(startDate, 6)
      : new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));
  const periodEnd = toISODate(endDate);

  // Previous period, for the comparison block.
  const prevStart =
    period === "WEEKLY"
      ? toISODate(addDays(startDate, -7))
      : toISODate(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() - 1, 1)));
  const prevEnd =
    period === "WEEKLY"
      ? toISODate(addDays(startDate, -1))
      : toISODate(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 0)));

  const [trades, prevTrades, review] = await Promise.all([
    getTrades(user.id, { range: "custom", from: periodStart, to: periodEnd }),
    getTrades(user.id, { range: "custom", from: prevStart, to: prevEnd }),
    prisma.periodReview.findUnique({
      where: {
        userId_period_periodStart: { userId: user.id, period, periodStart: startDate },
      },
    }),
  ]);

  const m = computeCoreMetrics(trades, Number(user.startingBalance));
  const prev = computeCoreMetrics(prevTrades);
  const setups = breakdownBySetup(trades);
  const instruments = breakdownByInstrument(trades);
  const mistakes = breakdownByMistake(trades, trades.length);
  const daily = groupByDay(trades);
  const weekdays = breakdownByDayOfWeek(trades);

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
        title="Reviews"
        description="Structured weekly and monthly reviews, with the numbers already worked out."
      />
      <div className="p-4 sm:p-6">
        <ReviewView
          period={period}
          periodStart={periodStart}
          periodEnd={periodEnd}
          currency={user.currency}
          metrics={{
            netPnl: m.netPnl,
            trades: m.totalTrades,
            winRate: m.winRate,
            totalR: m.totalR,
            avgR: m.avgR,
            profitFactor: m.profitFactor,
            expectancy: m.expectancy,
            maxDrawdown: m.maxDrawdown,
            maxDrawdownPercent: m.maxDrawdownPercent,
            avgWin: m.avgWin,
            avgLoss: m.avgLoss,
          }}
          previous={{
            netPnl: prev.netPnl,
            trades: prev.totalTrades,
            winRate: prev.winRate,
            totalR: prev.totalR,
            profitFactor: prev.profitFactor,
          }}
          equity={buildEquityCurve(trades, Number(user.startingBalance))}
          daily={daily}
          setups={setups}
          instruments={instruments}
          mistakes={mistakes}
          weekdays={weekdays}
          bestDay={bestDay}
          worstDay={worstDay}
          review={
            review
              ? {
                  wentWell: review.wentWell,
                  wentWrong: review.wentWrong,
                  biggestMistake: review.biggestMistake,
                  bestSetup: review.bestSetup,
                  worstSetup: review.worstSetup,
                  lessons: review.lessons,
                  nextFocus: review.nextFocus,
                  rating: review.rating,
                }
              : null
          }
        />
      </div>
    </>
  );
}
