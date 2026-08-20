import type { TradeRecord } from "./types";
import { DAY_NAMES } from "./constants";

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0);

export type CoreMetrics = ReturnType<typeof computeCoreMetrics>;

export function computeCoreMetrics(trades: TradeRecord[], startingBalance = 0) {
  const wins = trades.filter((t) => t.result === "WIN");
  const losses = trades.filter((t) => t.result === "LOSS");
  const breakevens = trades.filter((t) => t.result === "BREAKEVEN");

  const pnls = trades.map((t) => t.netPnl);
  const grossProfit = sum(wins.map((t) => t.netPnl));
  const grossLoss = Math.abs(sum(losses.map((t) => t.netPnl)));
  const netPnl = sum(pnls);
  const grossPnl = sum(trades.map((t) => t.grossPnl));
  const totalFees = sum(trades.map((t) => t.fees));

  const decided = wins.length + losses.length;
  const winRate = decided ? (wins.length / decided) * 100 : 0;
  const lossRate = decided ? (losses.length / decided) * 100 : 0;

  const avgWin = avg(wins.map((t) => t.netPnl));
  const avgLoss = avg(losses.map((t) => t.netPnl)); // negative
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Expectancy per trade in currency
  const expectancy = trades.length ? netPnl / trades.length : 0;

  const rValues = trades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
  const avgR = avg(rValues);
  const totalR = sum(rValues);

  const { maxWinStreak, maxLossStreak, currentWinStreak, currentLossStreak } = computeStreaks(trades);
  const drawdown = computeDrawdown(trades, startingBalance);

  const durations = trades
    .filter((t) => t.exitTime)
    .map((t) => new Date(t.exitTime as string).getTime() - new Date(t.entryTime).getTime())
    .filter((ms) => ms >= 0);

  const riskValues = trades.map((t) => t.riskAmount).filter((r): r is number => r !== null && r > 0);
  const avgRisk = avg(riskValues);
  const riskStdDev = standardDeviation(riskValues);

  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakevens.length,
    winRate,
    lossRate,
    netPnl,
    grossPnl,
    totalFees,
    grossProfit,
    grossLoss,
    profitFactor,
    expectancy,
    avgTrade: expectancy,
    avgWin,
    avgLoss,
    largestWin: wins.length ? Math.max(...wins.map((t) => t.netPnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((t) => t.netPnl)) : 0,
    avgR,
    totalR,
    bestR: rValues.length ? Math.max(...rValues) : 0,
    worstR: rValues.length ? Math.min(...rValues) : 0,
    avgRisk,
    riskStdDev,
    riskConsistency: avgRisk > 0 ? Math.max(0, 100 - (riskStdDev / avgRisk) * 100) : 0,
    maxWinStreak,
    maxLossStreak,
    currentWinStreak,
    currentLossStreak,
    avgHoldingMs: avg(durations),
    ...drawdown,
  };
}

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = avg(values);
  return Math.sqrt(avg(values.map((v) => (v - mean) ** 2)));
}

function chronological(trades: TradeRecord[]) {
  return [...trades].sort(
    (a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime(),
  );
}

function computeStreaks(trades: TradeRecord[]) {
  const ordered = chronological(trades).filter((t) => t.result !== "BREAKEVEN");
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let runWin = 0;
  let runLoss = 0;

  for (const trade of ordered) {
    if (trade.result === "WIN") {
      runWin += 1;
      runLoss = 0;
    } else {
      runLoss += 1;
      runWin = 0;
    }
    maxWinStreak = Math.max(maxWinStreak, runWin);
    maxLossStreak = Math.max(maxLossStreak, runLoss);
  }

  return {
    maxWinStreak,
    maxLossStreak,
    currentWinStreak: runWin,
    currentLossStreak: runLoss,
  };
}

export function computeDrawdown(trades: TradeRecord[], startingBalance = 0) {
  const ordered = chronological(trades);
  let equity = startingBalance;
  let peak = startingBalance;
  let peakTime = ordered.length ? new Date(ordered[0].entryTime) : null;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  let maxDrawdownDurationMs = 0;
  let inDrawdown = false;
  let drawdownStart: Date | null = null;
  let recoveryMs: number | null = null;

  const curve: { date: string; equity: number; drawdown: number; drawdownPercent: number }[] = [];

  for (const trade of ordered) {
    equity += trade.netPnl;
    const time = new Date(trade.exitTime ?? trade.entryTime);

    if (equity > peak) {
      if (inDrawdown && drawdownStart) {
        const duration = time.getTime() - drawdownStart.getTime();
        if (recoveryMs === null || duration > recoveryMs) recoveryMs = duration;
        inDrawdown = false;
      }
      peak = equity;
      peakTime = time;
    } else if (equity < peak) {
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = peakTime ?? time;
      }
    }

    const dd = peak - equity;
    const ddPercent = peak !== 0 ? (dd / Math.abs(peak)) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownPercent = ddPercent;
      if (drawdownStart) {
        maxDrawdownDurationMs = Math.max(
          maxDrawdownDurationMs,
          time.getTime() - drawdownStart.getTime(),
        );
      }
    }

    curve.push({
      date: time.toISOString(),
      equity,
      drawdown: -dd,
      drawdownPercent: -ddPercent,
    });
  }

  const currentDrawdown = peak - equity;

  return {
    endingEquity: equity,
    peakEquity: peak,
    maxDrawdown,
    maxDrawdownPercent,
    maxDrawdownDurationMs,
    currentDrawdown,
    currentDrawdownPercent: peak !== 0 ? (currentDrawdown / Math.abs(peak)) * 100 : 0,
    recoveryMs,
    drawdownCurve: curve,
  };
}

export function buildEquityCurve(trades: TradeRecord[], startingBalance = 0) {
  const ordered = chronological(trades);
  let cumulativePnl = 0;
  let cumulativeR = 0;

  const points = ordered.map((trade, index) => {
    cumulativePnl += trade.netPnl;
    cumulativeR += trade.rMultiple ?? 0;
    return {
      index: index + 1,
      id: trade.id,
      date: (trade.exitTime ?? trade.entryTime).slice(0, 10),
      time: trade.exitTime ?? trade.entryTime,
      symbol: trade.symbol,
      pnl: trade.netPnl,
      cumulativePnl,
      balance: startingBalance + cumulativePnl,
      cumulativeR,
    };
  });

  return [
    {
      index: 0,
      id: "start",
      date: ordered.length ? ordered[0].tradeDate : "",
      time: ordered.length ? ordered[0].entryTime : "",
      symbol: "",
      pnl: 0,
      cumulativePnl: 0,
      balance: startingBalance,
      cumulativeR: 0,
    },
    ...points,
  ];
}

export function groupByDay(trades: TradeRecord[]) {
  const map = new Map<string, TradeRecord[]>();
  for (const trade of trades) {
    const list = map.get(trade.tradeDate) ?? [];
    list.push(trade);
    map.set(trade.tradeDate, list);
  }

  return [...map.entries()]
    .map(([date, dayTrades]) => {
      const netPnl = sum(dayTrades.map((t) => t.netPnl));
      const wins = dayTrades.filter((t) => t.result === "WIN").length;
      const losses = dayTrades.filter((t) => t.result === "LOSS").length;
      const rValues = dayTrades.map((t) => t.rMultiple).filter((r): r is number => r !== null);
      return {
        date,
        netPnl,
        trades: dayTrades.length,
        wins,
        losses,
        winRate: wins + losses ? (wins / (wins + losses)) * 100 : 0,
        totalR: sum(rValues),
        avgR: avg(rValues),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function groupByMonth(trades: TradeRecord[]) {
  const map = new Map<string, TradeRecord[]>();
  for (const trade of trades) {
    const key = trade.tradeDate.slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(trade);
    map.set(key, list);
  }

  return [...map.entries()]
    .map(([month, monthTrades]) => {
      const m = computeCoreMetrics(monthTrades);
      return {
        month,
        netPnl: m.netPnl,
        trades: m.totalTrades,
        winRate: m.winRate,
        avgR: m.avgR,
        totalR: m.totalR,
        profitFactor: m.profitFactor,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
}

export type Breakdown = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  avgPnl: number;
  avgR: number;
  totalR: number;
  profitFactor: number;
  expectancy: number;
  bestTrade: number;
  worstTrade: number;
};

export function breakdownBy(
  trades: TradeRecord[],
  keyFn: (trade: TradeRecord) => { key: string; label: string } | null,
): Breakdown[] {
  const map = new Map<string, { label: string; trades: TradeRecord[] }>();

  for (const trade of trades) {
    const entry = keyFn(trade);
    if (!entry) continue;
    const bucket = map.get(entry.key) ?? { label: entry.label, trades: [] };
    bucket.trades.push(trade);
    map.set(entry.key, bucket);
  }

  return [...map.entries()]
    .map(([key, bucket]) => {
      const m = computeCoreMetrics(bucket.trades);
      return {
        key,
        label: bucket.label,
        trades: m.totalTrades,
        wins: m.winningTrades,
        losses: m.losingTrades,
        winRate: m.winRate,
        netPnl: m.netPnl,
        avgPnl: m.avgTrade,
        avgR: m.avgR,
        totalR: m.totalR,
        profitFactor: m.profitFactor,
        expectancy: m.expectancy,
        bestTrade: m.largestWin,
        worstTrade: m.largestLoss,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
}

export function breakdownByInstrument(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) => ({ key: t.symbol, label: t.symbol }));
}

export function breakdownBySetup(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) =>
    t.setupId ? { key: t.setupId, label: t.setupName ?? "Unnamed setup" } : null,
  );
}

export function breakdownByStrategy(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) =>
    t.strategyId ? { key: t.strategyId, label: t.strategyName ?? "Unnamed strategy" } : null,
  );
}

export function breakdownBySession(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) =>
    t.sessionId ? { key: t.sessionId, label: t.sessionName ?? "Unnamed session" } : null,
  );
}

export function breakdownByTag(trades: TradeRecord[]) {
  const map = new Map<string, { label: string; trades: TradeRecord[] }>();
  for (const trade of trades) {
    for (const tag of trade.tags) {
      const bucket = map.get(tag.id) ?? { label: tag.name, trades: [] };
      bucket.trades.push(trade);
      map.set(tag.id, bucket);
    }
  }
  return summarizeBuckets(map);
}

export function breakdownByMistake(trades: TradeRecord[], totalTrades: number) {
  const map = new Map<string, { label: string; trades: TradeRecord[] }>();
  for (const trade of trades) {
    for (const mistake of trade.mistakes) {
      const bucket = map.get(mistake.id) ?? { label: mistake.name, trades: [] };
      bucket.trades.push(trade);
      map.set(mistake.id, bucket);
    }
  }
  return summarizeBuckets(map).map((row) => ({
    ...row,
    shareOfTrades: totalTrades ? (row.trades / totalTrades) * 100 : 0,
  }));
}

function summarizeBuckets(map: Map<string, { label: string; trades: TradeRecord[] }>): Breakdown[] {
  return [...map.entries()]
    .map(([key, bucket]) => {
      const m = computeCoreMetrics(bucket.trades);
      return {
        key,
        label: bucket.label,
        trades: m.totalTrades,
        wins: m.winningTrades,
        losses: m.losingTrades,
        winRate: m.winRate,
        netPnl: m.netPnl,
        avgPnl: m.avgTrade,
        avgR: m.avgR,
        totalR: m.totalR,
        profitFactor: m.profitFactor,
        expectancy: m.expectancy,
        bestTrade: m.largestWin,
        worstTrade: m.largestLoss,
      };
    })
    .sort((a, b) => b.trades - a.trades);
}

export function breakdownByDirection(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) => ({ key: t.direction, label: t.direction }));
}

export function breakdownByDayOfWeek(trades: TradeRecord[]) {
  const rows = breakdownBy(trades, (t) => {
    const day = new Date(`${t.tradeDate}T00:00:00Z`).getUTCDay();
    return { key: String(day), label: DAY_NAMES[day].slice(0, 3) };
  });
  return rows.sort((a, b) => Number(a.key) - Number(b.key));
}

export function breakdownByHour(trades: TradeRecord[]) {
  const rows = breakdownBy(trades, (t) => {
    const hour = new Date(t.entryTime).getUTCHours();
    return { key: String(hour), label: `${String(hour).padStart(2, "0")}:00` };
  });
  return rows.sort((a, b) => Number(a.key) - Number(b.key));
}

export function breakdownByMarketCondition(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) =>
    t.marketCondition ? { key: t.marketCondition, label: t.marketCondition } : null,
  );
}

/** Buckets a 1–10 psychology score into low / medium / high bands. */
export function breakdownByScoreBand(
  trades: TradeRecord[],
  field: "confidenceBefore" | "setupQuality" | "executionQuality" | "disciplineScore",
) {
  const bands = [
    { key: "1-4", label: "Low (1–4)", min: 1, max: 4 },
    { key: "5-7", label: "Medium (5–7)", min: 5, max: 7 },
    { key: "8-10", label: "High (8–10)", min: 8, max: 10 },
  ];

  return bands.map((band) => {
    const subset = trades.filter((t) => {
      const value = t[field];
      return value !== null && value >= band.min && value <= band.max;
    });
    const m = computeCoreMetrics(subset);
    return {
      key: band.key,
      label: band.label,
      trades: m.totalTrades,
      winRate: m.winRate,
      netPnl: m.netPnl,
      avgR: m.avgR,
      expectancy: m.expectancy,
      profitFactor: m.profitFactor,
    };
  });
}

export function breakdownByPlanAdherence(trades: TradeRecord[]) {
  return [
    { key: "yes", label: "Followed plan", subset: trades.filter((t) => t.followedPlan === true) },
    { key: "no", label: "Broke plan", subset: trades.filter((t) => t.followedPlan === false) },
  ].map(({ key, label, subset }) => {
    const m = computeCoreMetrics(subset);
    return {
      key,
      label,
      trades: m.totalTrades,
      winRate: m.winRate,
      netPnl: m.netPnl,
      avgR: m.avgR,
      expectancy: m.expectancy,
      profitFactor: m.profitFactor,
    };
  });
}

export function breakdownByEmotion(trades: TradeRecord[]) {
  return breakdownBy(trades, (t) =>
    t.emotionBefore ? { key: t.emotionBefore, label: t.emotionBefore } : null,
  );
}

/** Histogram helper — buckets numeric values into fixed-width bins. */
export function histogram(values: number[], bucketCount = 12) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ label: formatBucket(min), from: min, to: max, count: values.length }];

  const width = (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }));

  for (const value of values) {
    let index = Math.floor((value - min) / width);
    if (index >= bucketCount) index = bucketCount - 1;
    if (index < 0) index = 0;
    buckets[index].count += 1;
  }

  return buckets.map((b) => ({ ...b, label: formatBucket(b.from) }));
}

function formatBucket(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(Math.abs(value) < 10 ? 1 : 0);
}

export function durationBuckets(trades: TradeRecord[]) {
  const buckets = [
    { key: "<5m", label: "< 5 min", max: 5 * 60_000 },
    { key: "5-15m", label: "5–15 min", max: 15 * 60_000 },
    { key: "15-60m", label: "15–60 min", max: 60 * 60_000 },
    { key: "1-4h", label: "1–4 h", max: 4 * 60 * 60_000 },
    { key: "4-24h", label: "4–24 h", max: 24 * 60 * 60_000 },
    { key: ">1d", label: "> 1 day", max: Infinity },
  ];

  return buckets.map((bucket, index) => {
    const lower = index === 0 ? 0 : buckets[index - 1].max;
    const subset = trades.filter((t) => {
      if (!t.exitTime) return false;
      const ms = new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime();
      return ms >= lower && ms < bucket.max;
    });
    const m = computeCoreMetrics(subset);
    return {
      key: bucket.key,
      label: bucket.label,
      count: subset.length,
      netPnl: m.netPnl,
      winRate: m.winRate,
      avgR: m.avgR,
    };
  });
}
