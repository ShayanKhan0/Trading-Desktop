import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { TradeFilters, TradeRecord } from "./types";
import { resolveRange } from "./date-range";

const num = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));

export const tradeInclude = {
  setup: { select: { id: true, name: true } },
  strategy: { select: { id: true, name: true } },
  session: { select: { id: true, name: true } },
  tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
  mistakes: { include: { mistake: { select: { id: true, name: true } } } },
  _count: { select: { images: true } },
} satisfies Prisma.TradeInclude;

type TradeWithRelations = Prisma.TradeGetPayload<{ include: typeof tradeInclude }>;

/** Converts Prisma Decimals and relations into plain JSON-safe records for the client. */
export function serializeTrade(trade: TradeWithRelations): TradeRecord {
  return {
    id: trade.id,
    tradeDate: trade.tradeDate.toISOString().slice(0, 10),
    entryTime: trade.entryTime.toISOString(),
    exitTime: trade.exitTime ? trade.exitTime.toISOString() : null,
    symbol: trade.symbol,
    market: trade.market,
    direction: trade.direction,
    positionSize: Number(trade.positionSize),
    entryPrice: Number(trade.entryPrice),
    exitPrice: num(trade.exitPrice),
    stopLoss: num(trade.stopLoss),
    takeProfit: num(trade.takeProfit),
    grossPnl: Number(trade.grossPnl),
    fees: Number(trade.fees),
    netPnl: Number(trade.netPnl),
    riskAmount: num(trade.riskAmount),
    rewardAmount: num(trade.rewardAmount),
    plannedRr: num(trade.plannedRr),
    rMultiple: num(trade.rMultiple),
    pnlPercent: num(trade.pnlPercent),
    result: trade.result,
    strategyId: trade.strategyId,
    strategyName: trade.strategy?.name ?? null,
    setupId: trade.setupId,
    setupName: trade.setup?.name ?? null,
    sessionId: trade.sessionId,
    sessionName: trade.session?.name ?? null,
    marketCondition: trade.marketCondition,
    confidenceBefore: trade.confidenceBefore,
    emotionBefore: trade.emotionBefore,
    emotionAfter: trade.emotionAfter,
    followedPlan: trade.followedPlan,
    setupQuality: trade.setupQuality,
    executionQuality: trade.executionQuality,
    disciplineScore: trade.disciplineScore,
    thesis: trade.thesis,
    reasonEntry: trade.reasonEntry,
    reasonExit: trade.reasonExit,
    whatWentWell: trade.whatWentWell,
    whatWentWrong: trade.whatWentWrong,
    lesson: trade.lesson,
    notes: trade.notes,
    isDemo: trade.isDemo,
    tags: trade.tags.map((t) => t.tag),
    mistakes: trade.mistakes.map((m) => m.mistake),
    imageCount: trade._count.images,
  };
}

/** Translates the global filter set into a Prisma where clause. */
export function buildTradeWhere(userId: string, filters: TradeFilters): Prisma.TradeWhereInput {
  const { from, to } = resolveRange(filters.range, filters.from, filters.to);
  const where: Prisma.TradeWhereInput = { userId };
  const and: Prisma.TradeWhereInput[] = [];

  if (from || to) {
    where.tradeDate = {
      ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
      ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
    };
  }

  if (filters.symbols?.length) where.symbol = { in: filters.symbols };
  if (filters.markets?.length) where.market = { in: filters.markets };
  if (filters.directions?.length) where.direction = { in: filters.directions };
  if (filters.results?.length) where.result = { in: filters.results };
  if (filters.setupIds?.length) where.setupId = { in: filters.setupIds };
  if (filters.strategyIds?.length) where.strategyId = { in: filters.strategyIds };
  if (filters.sessionIds?.length) where.sessionId = { in: filters.sessionIds };
  if (filters.followedPlan) where.followedPlan = filters.followedPlan === "yes";

  if (filters.tagIds?.length) {
    and.push({ tags: { some: { tagId: { in: filters.tagIds } } } });
  }
  if (filters.mistakeIds?.length) {
    and.push({ mistakes: { some: { mistakeId: { in: filters.mistakeIds } } } });
  }

  if (filters.rMin !== undefined || filters.rMax !== undefined) {
    where.rMultiple = {
      ...(filters.rMin !== undefined ? { gte: filters.rMin } : {}),
      ...(filters.rMax !== undefined ? { lte: filters.rMax } : {}),
    };
  }

  if (filters.pnlMin !== undefined || filters.pnlMax !== undefined) {
    where.netPnl = {
      ...(filters.pnlMin !== undefined ? { gte: filters.pnlMin } : {}),
      ...(filters.pnlMax !== undefined ? { lte: filters.pnlMax } : {}),
    };
  }

  if (filters.search) {
    const search = filters.search;
    and.push({
      OR: [
        { symbol: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
        { thesis: { contains: search, mode: "insensitive" } },
        { lesson: { contains: search, mode: "insensitive" } },
        { reasonEntry: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) where.AND = and;
  return where;
}

export async function getTrades(userId: string, filters: TradeFilters): Promise<TradeRecord[]> {
  const trades = await prisma.trade.findMany({
    where: buildTradeWhere(userId, filters),
    include: tradeInclude,
    orderBy: [{ tradeDate: "desc" }, { entryTime: "desc" }],
  });
  return trades.map(serializeTrade);
}

export async function getTradesPage(
  userId: string,
  filters: TradeFilters,
  options: { page: number; pageSize: number; sortBy: string; sortDir: "asc" | "desc" },
) {
  const where = buildTradeWhere(userId, filters);
  const orderBy = buildOrderBy(options.sortBy, options.sortDir);

  const [rows, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: tradeInclude,
      orderBy,
      skip: (options.page - 1) * options.pageSize,
      take: options.pageSize,
    }),
    prisma.trade.count({ where }),
  ]);

  return { trades: rows.map(serializeTrade), total };
}

const SORTABLE: Record<string, string> = {
  tradeDate: "tradeDate",
  symbol: "symbol",
  direction: "direction",
  entryPrice: "entryPrice",
  exitPrice: "exitPrice",
  positionSize: "positionSize",
  netPnl: "netPnl",
  pnlPercent: "pnlPercent",
  riskAmount: "riskAmount",
  rMultiple: "rMultiple",
  result: "result",
  entryTime: "entryTime",
};

function buildOrderBy(sortBy: string, sortDir: "asc" | "desc"): Prisma.TradeOrderByWithRelationInput[] {
  const field = SORTABLE[sortBy];
  if (!field) return [{ tradeDate: sortDir }, { entryTime: sortDir }];
  if (field === "tradeDate") return [{ tradeDate: sortDir }, { entryTime: sortDir }];
  return [{ [field]: sortDir } as Prisma.TradeOrderByWithRelationInput];
}

/** Loads the reference data used to populate filter menus and forms. */
export async function getTaxonomy(userId: string) {
  const [instruments, strategies, setups, sessions, tags, mistakes, symbols] = await Promise.all([
    prisma.instrument.findMany({ where: { userId }, orderBy: { symbol: "asc" } }),
    prisma.strategy.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.setup.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.tradingSession.findMany({ where: { userId }, orderBy: { startHour: "asc" } }),
    prisma.tag.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.mistakeType.findMany({ where: { userId }, orderBy: { name: "asc" } }),
    prisma.trade.findMany({
      where: { userId },
      select: { symbol: true },
      distinct: ["symbol"],
      orderBy: { symbol: "asc" },
    }),
  ]);

  return {
    instruments: instruments.map((i) => ({
      id: i.id,
      symbol: i.symbol,
      name: i.name,
      market: i.market,
      tickSize: i.tickSize ? Number(i.tickSize) : null,
      tickValue: i.tickValue ? Number(i.tickValue) : null,
    })),
    strategies: strategies.map((s) => ({ id: s.id, name: s.name, description: s.description })),
    setups: setups.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      strategyId: s.strategyId,
    })),
    sessions: sessions.map((s) => ({
      id: s.id,
      name: s.name,
      startHour: s.startHour,
      endHour: s.endHour,
    })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
    mistakes: mistakes.map((m) => ({ id: m.id, name: m.name })),
    symbols: symbols.map((s) => s.symbol),
  };
}

export type Taxonomy = Awaited<ReturnType<typeof getTaxonomy>>;

/** Parses URL search params into the global filter object. */
export function parseFilters(params: Record<string, string | string[] | undefined>): TradeFilters {
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const list = (key: string) => {
    const value = first(key);
    return value ? value.split(",").filter(Boolean) : undefined;
  };
  const number = (key: string) => {
    const value = first(key);
    if (value === undefined || value === "") return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const followedPlan = first("followedPlan");

  return {
    range: first("range") ?? "month",
    from: first("from"),
    to: first("to"),
    symbols: list("symbols"),
    markets: list("markets"),
    directions: list("directions"),
    results: list("results"),
    setupIds: list("setups"),
    strategyIds: list("strategies"),
    sessionIds: list("sessions"),
    tagIds: list("tags"),
    mistakeIds: list("mistakes"),
    followedPlan: followedPlan === "yes" || followedPlan === "no" ? followedPlan : undefined,
    rMin: number("rMin"),
    rMax: number("rMax"),
    pnlMin: number("pnlMin"),
    pnlMax: number("pnlMax"),
    search: first("search"),
  };
}
