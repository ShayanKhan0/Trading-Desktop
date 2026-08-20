import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTrades, parseFilters } from "@/lib/queries";
import { computeCoreMetrics } from "@/lib/metrics";
import { formatDuration } from "@/lib/format";

export const dynamic = "force-dynamic";

const TRADE_COLUMNS = [
  "date",
  "entry_time",
  "exit_time",
  "symbol",
  "market",
  "direction",
  "position_size",
  "entry_price",
  "exit_price",
  "stop_loss",
  "take_profit",
  "gross_pnl",
  "fees",
  "net_pnl",
  "pnl_percent",
  "risk_amount",
  "reward_amount",
  "planned_rr",
  "r_multiple",
  "result",
  "strategy",
  "setup",
  "session",
  "market_condition",
  "confidence_before",
  "emotion_before",
  "emotion_after",
  "followed_plan",
  "setup_quality",
  "execution_quality",
  "discipline_score",
  "tags",
  "mistakes",
  "confluences",
  "thesis",
  "reason_entry",
  "reason_exit",
  "what_went_well",
  "what_went_wrong",
  "lesson",
  "notes",
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const type = params.type ?? "trades";
  const filters = parseFilters(params);
  const trades = await getTrades(user.id, filters);

  const csv = type === "summary" ? summaryCsv(trades) : tradesCsv(trades);
  const filename = `tradeledger-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function tradesCsv(trades: Awaited<ReturnType<typeof getTrades>>) {
  const rows = trades.map((trade) => [
    trade.tradeDate,
    trade.entryTime.slice(11, 16),
    trade.exitTime ? trade.exitTime.slice(11, 16) : "",
    trade.symbol,
    trade.market,
    trade.direction,
    trade.positionSize,
    trade.entryPrice,
    trade.exitPrice ?? "",
    trade.stopLoss ?? "",
    trade.takeProfit ?? "",
    trade.grossPnl,
    trade.fees,
    trade.netPnl,
    trade.pnlPercent ?? "",
    trade.riskAmount ?? "",
    trade.rewardAmount ?? "",
    trade.plannedRr ?? "",
    trade.rMultiple ?? "",
    trade.result,
    trade.strategyName ?? "",
    trade.setupName ?? "",
    trade.sessionName ?? "",
    trade.marketCondition ?? "",
    trade.confidenceBefore ?? "",
    trade.emotionBefore ?? "",
    trade.emotionAfter ?? "",
    trade.followedPlan === null ? "" : trade.followedPlan ? "yes" : "no",
    trade.setupQuality ?? "",
    trade.executionQuality ?? "",
    trade.disciplineScore ?? "",
    trade.tags.map((t) => t.name).join("; "),
    trade.mistakes.map((m) => m.name).join("; "),
    trade.confluences.map((c) => c.name).join("; "),
    trade.thesis ?? "",
    trade.reasonEntry ?? "",
    trade.reasonExit ?? "",
    trade.whatWentWell ?? "",
    trade.whatWentWrong ?? "",
    trade.lesson ?? "",
    trade.notes ?? "",
  ]);

  return toCsv([TRADE_COLUMNS, ...rows]);
}

function summaryCsv(trades: Awaited<ReturnType<typeof getTrades>>) {
  const m = computeCoreMetrics(trades);
  const rows: (string | number)[][] = [
    ["metric", "value"],
    ["Total trades", m.totalTrades],
    ["Winning trades", m.winningTrades],
    ["Losing trades", m.losingTrades],
    ["Breakeven trades", m.breakevenTrades],
    ["Win rate %", m.winRate.toFixed(2)],
    ["Net P&L", m.netPnl.toFixed(2)],
    ["Gross P&L", m.grossPnl.toFixed(2)],
    ["Total fees", m.totalFees.toFixed(2)],
    ["Profit factor", Number.isFinite(m.profitFactor) ? m.profitFactor.toFixed(2) : "Infinity"],
    ["Expectancy per trade", m.expectancy.toFixed(2)],
    ["Average winner", m.avgWin.toFixed(2)],
    ["Average loser", m.avgLoss.toFixed(2)],
    ["Largest winner", m.largestWin.toFixed(2)],
    ["Largest loser", m.largestLoss.toFixed(2)],
    ["Average R", m.avgR.toFixed(3)],
    ["Total R", m.totalR.toFixed(2)],
    ["Best R", m.bestR.toFixed(2)],
    ["Worst R", m.worstR.toFixed(2)],
    ["Max drawdown", m.maxDrawdown.toFixed(2)],
    ["Max drawdown %", m.maxDrawdownPercent.toFixed(2)],
    ["Max consecutive wins", m.maxWinStreak],
    ["Max consecutive losses", m.maxLossStreak],
    ["Average risk per trade", m.avgRisk.toFixed(2)],
    ["Risk consistency %", m.riskConsistency.toFixed(1)],
    ["Average holding time", formatDuration(m.avgHoldingMs)],
  ];

  return toCsv(rows);
}

function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell === null || cell === undefined ? "" : String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\n");
}
