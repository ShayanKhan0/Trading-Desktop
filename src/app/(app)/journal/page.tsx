import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTrades, parseFilters } from "@/lib/queries";
import { computeCoreMetrics } from "@/lib/metrics";
import { PageHeader } from "@/components/page-header";
import { DailyJournalView } from "@/components/daily-journal-view";

export const metadata = { title: "Daily journal" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const date = single("date") ?? new Date().toISOString().slice(0, 10);

  const [trades, journal, recentJournals] = await Promise.all([
    getTrades(user.id, { ...parseFilters({}), range: "custom", from: date, to: date }),
    prisma.dailyJournal.findUnique({
      where: { userId_date: { userId: user.id, date: new Date(`${date}T00:00:00.000Z`) } },
    }),
    prisma.dailyJournal.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 20,
      select: { date: true, rating: true, followedPlan: true },
    }),
  ]);

  const metrics = computeCoreMetrics(trades);
  const best = trades.reduce<(typeof trades)[number] | null>(
    (top, trade) => (!top || trade.netPnl > top.netPnl ? trade : top),
    null,
  );
  const worst = trades.reduce<(typeof trades)[number] | null>(
    (bottom, trade) => (!bottom || trade.netPnl < bottom.netPnl ? trade : bottom),
    null,
  );

  return (
    <>
      <PageHeader
        title="Daily journal"
        description="Close the day with the same handful of questions — that's where the compounding happens."
      />

      <div className="p-4 sm:p-6">
        <DailyJournalView
          date={date}
          currency={user.currency}
          metrics={{
            netPnl: metrics.netPnl,
            trades: metrics.totalTrades,
            winRate: metrics.winRate,
            avgR: metrics.avgR,
            totalR: metrics.totalR,
            wins: metrics.winningTrades,
            losses: metrics.losingTrades,
          }}
          bestTrade={best ? { id: best.id, symbol: best.symbol, netPnl: best.netPnl } : null}
          worstTrade={worst ? { id: worst.id, symbol: worst.symbol, netPnl: worst.netPnl } : null}
          tradesList={trades.map((trade) => ({
            id: trade.id,
            symbol: trade.symbol,
            direction: trade.direction,
            netPnl: trade.netPnl,
            rMultiple: trade.rMultiple,
            setupName: trade.setupName,
          }))}
          journal={
            journal
              ? {
                  followedPlan: journal.followedPlan,
                  didWell: journal.didWell,
                  mistakesMade: journal.mistakesMade,
                  biggestLesson: journal.biggestLesson,
                  improveTomorrow: journal.improveTomorrow,
                  psychologyNotes: journal.psychologyNotes,
                  overtraded: journal.overtraded,
                  rating: journal.rating,
                  notes: journal.notes,
                }
              : null
          }
          recent={recentJournals.map((entry) => ({
            date: entry.date.toISOString().slice(0, 10),
            rating: entry.rating,
            followedPlan: entry.followedPlan,
          }))}
        />
      </div>
    </>
  );
}
