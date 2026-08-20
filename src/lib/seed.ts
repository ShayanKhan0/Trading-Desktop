import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import {
  DEFAULT_CONFLUENCES,
  DEFAULT_MISTAKES,
  DEFAULT_SESSIONS,
  DEFAULT_SETUPS,
  DEFAULT_TAGS,
  EMOTIONS,
  MARKET_CONDITIONS,
} from "./constants";
import { calculateTrade } from "./calc";

const DEFAULT_INSTRUMENTS = [
  { symbol: "NQ", name: "E-mini Nasdaq 100", market: "FUTURES", tickSize: 0.25, tickValue: 5 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq 100", market: "FUTURES", tickSize: 0.25, tickValue: 0.5 },
  { symbol: "ES", name: "E-mini S&P 500", market: "FUTURES", tickSize: 0.25, tickValue: 12.5 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", market: "FOREX", tickSize: 0.0001, tickValue: 10 },
  { symbol: "EURUSD", name: "Euro / US Dollar", market: "FOREX", tickSize: 0.0001, tickValue: 10 },
  { symbol: "XAUUSD", name: "Gold / US Dollar", market: "COMMODITIES", tickSize: 0.01, tickValue: 1 },
  { symbol: "DAX", name: "German DAX 40", market: "INDICES", tickSize: 0.5, tickValue: 12.5 },
];

const DEFAULT_STRATEGIES = [
  { name: "ICT Model", description: "Liquidity, displacement and fair value gap based entries." },
  { name: "Trend Continuation", description: "Pullback entries in the direction of the higher timeframe trend." },
  { name: "Mean Reversion", description: "Fading extended moves back to value." },
];

/** Creates the default instruments, strategies, setups, sessions, tags and mistakes for a user. */
export async function seedTaxonomy(userId: string) {
  await prisma.instrument.createMany({
    data: DEFAULT_INSTRUMENTS.map((i) => ({ ...i, userId })),
    skipDuplicates: true,
  });

  await prisma.strategy.createMany({
    data: DEFAULT_STRATEGIES.map((s) => ({ ...s, userId })),
    skipDuplicates: true,
  });

  const strategies = await prisma.strategy.findMany({ where: { userId } });
  const ict = strategies.find((s) => s.name === "ICT Model");

  await prisma.setup.createMany({
    data: DEFAULT_SETUPS.map((name) => ({
      name,
      userId,
      strategyId: ["ICT Silver Bullet", "Liquidity Sweep", "FVG Entry", "Breaker Block"].includes(name)
        ? (ict?.id ?? null)
        : null,
    })),
    skipDuplicates: true,
  });

  await prisma.tradingSession.createMany({
    data: DEFAULT_SESSIONS.map((s) => ({ ...s, userId })),
    skipDuplicates: true,
  });

  await prisma.tag.createMany({
    data: DEFAULT_TAGS.map((t) => ({ ...t, userId })),
    skipDuplicates: true,
  });

  await prisma.mistakeType.createMany({
    data: DEFAULT_MISTAKES.map((name) => ({ name, userId })),
    skipDuplicates: true,
  });

  await prisma.confluence.createMany({
    data: DEFAULT_CONFLUENCES.map((c) => ({ ...c, userId })),
    skipDuplicates: true,
  });
}

/**
 * Demo-only win-rate deltas per confluence. Stacking supportive confluences
 * lifts the win rate and the weak ones drag it down, so the confluence
 * breakdown has a genuine pattern to find rather than uniform noise.
 */
const CONFLUENCE_EDGE: Record<string, number> = {
  "HTF Bias Aligned": 0.06,
  "Market Structure Shift": 0.05,
  "Liquidity Swept": 0.04,
  "Fair Value Gap": 0.03,
  "Killzone Timing": 0.03,
  "Order Block": 0.02,
  "Daily Level": 0.02,
  "Trend Continuation": 0.02,
  "Volume Confirmation": 0.01,
  "Breaker Block": 0.01,
  "Round Number": -0.02,
  "Divergence": -0.03,
};

/** Deterministic PRNG so demo data is reproducible and reviewable. */
function makeRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const pick = <T,>(items: T[], random: () => number) => items[Math.floor(random() * items.length)];

export async function hasDemoData(userId: string) {
  const count = await prisma.trade.count({ where: { userId, isDemo: true } });
  return count > 0;
}

export async function clearDemoData(userId: string) {
  await prisma.trade.deleteMany({ where: { userId, isDemo: true } });
  await prisma.dailyJournal.deleteMany({ where: { userId, isDemo: true } });
  await prisma.periodReview.deleteMany({ where: { userId, isDemo: true } });
  await prisma.goal.deleteMany({ where: { userId, isDemo: true } });
}

/**
 * Generates ~6 months of realistic demo trades with per-setup edge, psychology
 * scores that correlate with outcomes, and occasional mistake clusters.
 */
export async function generateDemoData(userId: string, months = 6) {
  await clearDemoData(userId);
  await seedTaxonomy(userId);

  const [instruments, setups, sessions, tags, mistakes, confluences, strategies] = await Promise.all([
    prisma.instrument.findMany({ where: { userId } }),
    prisma.setup.findMany({ where: { userId } }),
    prisma.tradingSession.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } }),
    prisma.mistakeType.findMany({ where: { userId } }),
    prisma.confluence.findMany({ where: { userId } }),
    prisma.strategy.findMany({ where: { userId } }),
  ]);

  const random = makeRandom(20260820);

  // A single futures contract already risks several hundred dollars, so the demo
  // account is sized to make 1% risk per trade coherent. Only a still-default
  // balance is adjusted, never a figure the user has chosen themselves.
  const DEMO_BALANCE = 50_000;
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { startingBalance: true },
  });
  if (Number(account.startingBalance) === 10_000) {
    await prisma.user.update({
      where: { id: userId },
      data: { startingBalance: DEMO_BALANCE },
    });
  }
  const riskBudget = Math.max(Number(account.startingBalance), DEMO_BALANCE) * 0.01;

  // Each setup gets its own edge so setup comparison is meaningful.
  const setupEdge = new Map<string, { winRate: number; avgWinR: number; avgLossR: number }>();
  // Calibrated so the book as a whole earns a modest positive expectancy
  // (~+0.1R per trade) with one clearly unprofitable setup to find.
  const edges = [
    { winRate: 0.55, avgWinR: 1.25, avgLossR: -0.97 },
    { winRate: 0.47, avgWinR: 1.2, avgLossR: -0.97 },
    { winRate: 0.41, avgWinR: 1.55, avgLossR: -0.97 },
    { winRate: 0.35, avgWinR: 1.7, avgLossR: -1.0 },
    { winRate: 0.52, avgWinR: 0.98, avgLossR: -0.97 },
    { winRate: 0.3, avgWinR: 1.35, avgLossR: -1.05 },
  ];
  setups.forEach((setup, index) => setupEdge.set(setup.id, edges[index % edges.length]));

  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - months + 1, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const trades: Prisma.TradeUncheckedCreateInput[] = [];
  const tradeTagLinks: { tradeIndex: number; tagId: string }[] = [];
  const tradeMistakeLinks: { tradeIndex: number; mistakeId: string }[] = [];
  const tradeConfluenceLinks: { tradeIndex: number; confluenceId: string }[] = [];
  const journalDays: { date: Date; trades: number }[] = [];

  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue; // no weekend trading
    if (random() < 0.28) continue; // some days are flat

    const tradeCount = 1 + Math.floor(random() * 3);
    const tradingDate = new Date(day);
    let dayTrades = 0;

    for (let i = 0; i < tradeCount; i += 1) {
      const instrument = pick(instruments, random);
      const setup = pick(setups, random);
      const edge = setupEdge.get(setup.id)!;
      const session = pick(sessions, random);
      const direction = random() < 0.52 ? "LONG" : "SHORT";

      const hour = session.startHour + Math.floor(random() * Math.max(1, session.endHour - session.startHour));
      const minute = Math.floor(random() * 60);
      const entryTime = new Date(tradingDate);
      entryTime.setUTCHours(hour, minute, 0, 0);

      const holdMinutes = 4 + Math.floor(random() * 180);
      const exitTime = new Date(entryTime.getTime() + holdMinutes * 60_000);

      const pointValue =
        instrument.tickSize && instrument.tickValue
          ? Number(instrument.tickValue) / Number(instrument.tickSize)
          : 1;

      // Risk ~1% of the account per trade, with mild variance.
      const targetRisk = riskBudget * (0.75 + random() * 0.5);

      const basePrice =
        instrument.market === "FOREX" ? 1.1 + random() * 0.6
        : instrument.symbol === "XAUUSD" ? 2300 + random() * 300
        : instrument.symbol === "DAX" ? 17000 + random() * 2000
        : 15000 + random() * 4000;

      const stopDistance =
        instrument.market === "FOREX" ? 0.0015 + random() * 0.0025
        : instrument.symbol === "XAUUSD" ? 3 + random() * 6
        : 15 + random() * 35;

      const positionSize = Math.max(
        instrument.market === "FOREX" ? 0.1 : 1,
        Number((targetRisk / (stopDistance * pointValue)).toFixed(instrument.market === "FOREX" ? 2 : 0)),
      );

      const dir = direction === "LONG" ? 1 : -1;
      const entryPrice = round(basePrice, instrument.market === "FOREX" ? 5 : 2);
      const stopLoss = round(entryPrice - dir * stopDistance, instrument.market === "FOREX" ? 5 : 2);

      // Confluences are chosen before the outcome so their edge can shift it.
      const chosenConfluences: typeof confluences = [];
      if (confluences.length) {
        const wanted = 1 + Math.floor(random() * 5); // 1-5 stacked reasons
        const pool = [...confluences];
        for (let c = 0; c < wanted && pool.length; c += 1) {
          const [taken] = pool.splice(Math.floor(random() * pool.length), 1);
          chosenConfluences.push(taken);
        }
      }
      const confluenceDelta = chosenConfluences.reduce(
        (sum, c) => sum + (CONFLUENCE_EDGE[c.name] ?? 0),
        0,
      );
      const effectiveWinRate = Math.max(0.12, Math.min(0.82, edge.winRate + confluenceDelta));

      const isWin = random() < effectiveWinRate;
      const targetR = edge.avgWinR * (0.6 + random() * 0.9);
      const takeProfit = round(entryPrice + dir * stopDistance * targetR, instrument.market === "FOREX" ? 5 : 2);

      // Realised R: winners cluster near target, losers near -1R, with a few scratches.
      let realisedR: number;
      if (isWin) realisedR = targetR * (0.55 + random() * 0.55);
      else if (random() < 0.12) realisedR = -0.15 * random();
      else realisedR = edge.avgLossR * (0.7 + random() * 0.5);

      const exitPrice = round(
        entryPrice + dir * stopDistance * realisedR,
        instrument.market === "FOREX" ? 5 : 2,
      );

      const fees = round(positionSize * (instrument.market === "FOREX" ? 3 : 2.4), 2);

      const calc = calculateTrade({
        direction,
        positionSize,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        fees,
        pointValue,
      });

      // Psychology correlates with outcome, but only weakly — the noise is wide
      // enough that every band contains both winners and losers, as in real data.
      const noise = () => (random() + random() + random() - 1.5) * 4.2;
      const disciplineBase = isWin ? 6.9 : 5.9;
      const discipline = clampScore(Math.round(disciplineBase + noise()));
      const followedPlan = discipline >= 6 ? random() > 0.2 : random() > 0.6;
      const confidence = clampScore(Math.round((isWin ? 6.6 : 5.9) + noise()));
      const setupQuality = clampScore(Math.round((isWin ? 6.9 : 5.9) + noise()));
      const execution = clampScore(Math.round((followedPlan ? 6.9 : 5.2) + noise()));

      const index = trades.length;

      trades.push({
        userId,
        tradeDate: new Date(`${tradingDate.toISOString().slice(0, 10)}T00:00:00.000Z`),
        entryTime,
        exitTime,
        instrumentId: instrument.id,
        symbol: instrument.symbol,
        market: instrument.market,
        direction,
        positionSize,
        entryPrice,
        exitPrice,
        stopLoss,
        takeProfit,
        grossPnl: calc.grossPnl,
        fees: calc.fees,
        netPnl: calc.netPnl,
        riskAmount: calc.riskAmount,
        rewardAmount: calc.rewardAmount,
        plannedRr: calc.plannedRr,
        rMultiple: calc.rMultiple,
        pnlPercent: calc.pnlPercent,
        result: calc.result,
        setupId: setup.id,
        strategyId: setup.strategyId ?? pick(strategies, random).id,
        sessionId: session.id,
        marketCondition: pick(MARKET_CONDITIONS, random),
        confidenceBefore: confidence,
        emotionBefore: pick(EMOTIONS.slice(0, 6), random),
        emotionAfter: isWin ? pick(["Calm", "Confident", "Focused"], random) : pick(["Frustrated", "Neutral", "Anxious"], random),
        followedPlan,
        setupQuality,
        executionQuality: execution,
        disciplineScore: discipline,
        thesis: `${direction === "LONG" ? "Bullish" : "Bearish"} ${setup.name} on ${instrument.symbol} during the ${session.name} session.`,
        reasonEntry: `Price swept liquidity and displaced ${direction === "LONG" ? "higher" : "lower"}; entered on the retracement into the zone.`,
        reasonExit: isWin ? "Target reached at the opposing liquidity pool." : "Stop hit — thesis invalidated.",
        whatWentWell: followedPlan ? "Waited for confirmation and sized correctly." : "Identified the level early.",
        whatWentWrong: followedPlan ? "" : "Entered before the setup fully formed.",
        lesson: isWin
          ? "Patience at the level continues to pay."
          : "Losses are acceptable when the process is followed.",
        isDemo: true,
      });

      for (const confluence of chosenConfluences) {
        tradeConfluenceLinks.push({ tradeIndex: index, confluenceId: confluence.id });
      }

      // Tags: A+ setups on high quality trades, FOMO-ish tags when discipline is low.
      if (setupQuality >= 8) {
        const tag = tags.find((t) => t.name === "A+ Setup");
        if (tag) tradeTagLinks.push({ tradeIndex: index, tagId: tag.id });
      }
      if (confidence >= 8) {
        const tag = tags.find((t) => t.name === "High Confidence");
        if (tag) tradeTagLinks.push({ tradeIndex: index, tagId: tag.id });
      }
      if (execution >= 8) {
        const tag = tags.find((t) => t.name === "Clean Execution");
        if (tag) tradeTagLinks.push({ tradeIndex: index, tagId: tag.id });
      }
      if (holdMinutes < 20) {
        const tag = tags.find((t) => t.name === "Scalping");
        if (tag) tradeTagLinks.push({ tradeIndex: index, tagId: tag.id });
      }

      // Mistakes appear mostly when the plan was broken.
      if (!followedPlan || random() < 0.1) {
        const count = 1 + (random() < 0.25 ? 1 : 0);
        const chosen = new Set<string>();
        for (let m = 0; m < count; m += 1) {
          const mistake = pick(mistakes, random);
          if (chosen.has(mistake.id)) continue;
          chosen.add(mistake.id);
          tradeMistakeLinks.push({ tradeIndex: index, mistakeId: mistake.id });
        }
        const tag = tags.find((t) => t.name === "News Day");
        if (tag && random() < 0.2) tradeTagLinks.push({ tradeIndex: index, tagId: tag.id });
      }

      dayTrades += 1;
    }

    if (dayTrades > 0 && random() < 0.65) {
      journalDays.push({ date: new Date(tradingDate), trades: dayTrades });
    }
  }

  // Persist trades, then link tags and mistakes by the created ids.
  const createdIds: string[] = [];
  const CHUNK = 50;
  for (let i = 0; i < trades.length; i += CHUNK) {
    const chunk = trades.slice(i, i + CHUNK);
    const created = await prisma.$transaction(
      chunk.map((data) => prisma.trade.create({ data, select: { id: true } })),
    );
    createdIds.push(...created.map((c) => c.id));
  }

  if (tradeTagLinks.length) {
    await prisma.tradeTag.createMany({
      data: tradeTagLinks.map((link) => ({
        tradeId: createdIds[link.tradeIndex],
        tagId: link.tagId,
      })),
      skipDuplicates: true,
    });
  }

  if (tradeConfluenceLinks.length) {
    await prisma.tradeConfluence.createMany({
      data: tradeConfluenceLinks.map((link) => ({
        tradeId: createdIds[link.tradeIndex],
        confluenceId: link.confluenceId,
      })),
      skipDuplicates: true,
    });
  }

  if (tradeMistakeLinks.length) {
    await prisma.tradeMistake.createMany({
      data: tradeMistakeLinks.map((link) => ({
        tradeId: createdIds[link.tradeIndex],
        mistakeId: link.mistakeId,
      })),
      skipDuplicates: true,
    });
  }

  // Daily journals for a realistic review history.
  if (journalDays.length) {
    await prisma.dailyJournal.createMany({
      data: journalDays.map(({ date }) => {
        const good = random() > 0.4;
        return {
          userId,
          date: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
          followedPlan: good,
          didWell: good
            ? "Stuck to the session plan and only took A+ setups."
            : "Managed risk on the losers and stopped before it spiralled.",
          mistakesMade: good ? "Nothing significant." : "Took a marginal setup out of boredom.",
          biggestLesson: good
            ? "Fewer, higher quality trades produce better days."
            : "Sitting on my hands is a valid position.",
          improveTomorrow: "Pre-mark levels before the session opens.",
          psychologyNotes: good ? "Calm and patient throughout." : "Felt restless after the first loss.",
          overtraded: !good && random() < 0.5,
          rating: good ? 7 + Math.floor(random() * 4) : 3 + Math.floor(random() * 4),
          isDemo: true,
        };
      }),
      skipDuplicates: true,
    });
  }

  // A starter set of goals.
  await prisma.goal.createMany({
    data: [
      { userId, title: "Maximum 3 trades per day", metric: "TRADE_COUNT", period: "DAILY", target: 3, direction: "AT_MOST", isDemo: true },
      { userId, title: "Stop the day after -2R", metric: "TOTAL_R", period: "DAILY", target: -2, direction: "AT_LEAST", isDemo: true },
      { userId, title: "Keep discipline above 8", metric: "DISCIPLINE", period: "WEEKLY", target: 8, direction: "AT_LEAST", isDemo: true },
      { userId, title: "Journal every trading day", metric: "JOURNAL_COMPLETION", period: "MONTHLY", target: 100, direction: "AT_LEAST", isDemo: true },
      { userId, title: "Monthly net profit target", metric: "NET_PNL", period: "MONTHLY", target: 4000, direction: "AT_LEAST", isDemo: true },
      { userId, title: "Win rate above 50%", metric: "WIN_RATE", period: "MONTHLY", target: 50, direction: "AT_LEAST", isDemo: true },
    ],
    skipDuplicates: true,
  });

  return { trades: createdIds.length, journals: journalDays.length };
}

const round = (value: number, digits: number) => Number(value.toFixed(digits));
const clampScore = (value: number) => Math.max(1, Math.min(10, value));
