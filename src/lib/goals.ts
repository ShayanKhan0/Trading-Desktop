import type { TradeRecord } from "./types";
import { computeCoreMetrics } from "./metrics";
import { startOfMonth, startOfWeek, toISODate } from "./date-range";

export type GoalDefinition = {
  id: string;
  title: string;
  metric: string;
  period: string;
  target: number;
  direction: string;
  active: boolean;
  notes: string | null;
};

export type GoalProgress = {
  goal: GoalDefinition;
  actual: number;
  target: number;
  progressPercent: number;
  met: boolean;
  unit: "currency" | "percent" | "count" | "r" | "score";
  periodLabel: string;
  sampleSize: number;
};

const UNITS: Record<string, GoalProgress["unit"]> = {
  NET_PNL: "currency",
  MAX_LOSS: "currency",
  WIN_RATE: "percent",
  JOURNAL_COMPLETION: "percent",
  TRADE_COUNT: "count",
  AVG_R: "r",
  TOTAL_R: "r",
  DISCIPLINE: "score",
};

/** Returns the inclusive date bounds of the goal's current period. */
export function currentPeriod(period: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  switch (period) {
    case "DAILY":
      return { from: toISODate(today), to: toISODate(today), label: "Today" };
    case "WEEKLY":
      return { from: toISODate(startOfWeek(today)), to: toISODate(today), label: "This week" };
    case "YEARLY":
      return {
        from: `${today.getUTCFullYear()}-01-01`,
        to: toISODate(today),
        label: "This year",
      };
    case "MONTHLY":
    default:
      return { from: toISODate(startOfMonth(today)), to: toISODate(today), label: "This month" };
  }
}

export function evaluateGoal(
  goal: GoalDefinition,
  trades: TradeRecord[],
  journalDates: Set<string>,
  now = new Date(),
): GoalProgress {
  const period = currentPeriod(goal.period, now);
  const inPeriod = trades.filter(
    (trade) => trade.tradeDate >= period.from && trade.tradeDate <= period.to,
  );
  const m = computeCoreMetrics(inPeriod);

  let actual = 0;
  let sampleSize = inPeriod.length;

  switch (goal.metric) {
    case "NET_PNL":
      actual = m.netPnl;
      break;
    case "WIN_RATE":
      actual = m.winRate;
      break;
    case "TRADE_COUNT":
      // Daily trade-count limits are judged against the worst day in the period.
      actual =
        goal.period === "DAILY"
          ? inPeriod.length
          : maxTradesInADay(inPeriod);
      break;
    case "MAX_LOSS":
      actual = Math.min(0, m.netPnl);
      break;
    case "AVG_R":
      actual = m.avgR;
      break;
    case "TOTAL_R":
      actual = m.totalR;
      break;
    case "DISCIPLINE": {
      const scores = inPeriod
        .map((t) => t.disciplineScore)
        .filter((s): s is number => s !== null);
      sampleSize = scores.length;
      actual = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      break;
    }
    case "JOURNAL_COMPLETION": {
      const tradingDays = new Set(inPeriod.map((t) => t.tradeDate));
      sampleSize = tradingDays.size;
      const journalled = [...tradingDays].filter((day) => journalDates.has(day)).length;
      actual = tradingDays.size ? (journalled / tradingDays.size) * 100 : 0;
      break;
    }
    default:
      actual = 0;
  }

  const met = goal.direction === "AT_MOST" ? actual <= goal.target : actual >= goal.target;

  // Progress is expressed against the target, clamped for display purposes.
  const progressPercent =
    goal.direction === "AT_MOST"
      ? goal.target === 0
        ? met
          ? 100
          : 0
        : Math.max(0, Math.min(100, (1 - (actual - goal.target) / Math.abs(goal.target)) * 100))
      : goal.target === 0
        ? met
          ? 100
          : 0
        : Math.max(0, Math.min(100, (actual / goal.target) * 100));

  return {
    goal,
    actual,
    target: goal.target,
    progressPercent,
    met,
    unit: UNITS[goal.metric] ?? "count",
    periodLabel: period.label,
    sampleSize,
  };
}

function maxTradesInADay(trades: TradeRecord[]) {
  const counts = new Map<string, number>();
  for (const trade of trades) {
    counts.set(trade.tradeDate, (counts.get(trade.tradeDate) ?? 0) + 1);
  }
  return counts.size ? Math.max(...counts.values()) : 0;
}
