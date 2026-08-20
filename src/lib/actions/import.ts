"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { calculateTrade } from "@/lib/calc";

export type ImportRow = Record<string, string>;

export type ImportResult = {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: { row: number; message: string }[];
};


type Mapping = Record<string, string>;

/** Validates mapped CSV rows without writing anything — used for the preview step. */
export async function validateImport(rows: ImportRow[], mapping: Mapping) {
  const user = await requireUser();
  const errors: { row: number; message: string }[] = [];
  const preview: {
    row: number;
    tradeDate: string;
    symbol: string;
    direction: string;
    netPnl: number | null;
    duplicate: boolean;
  }[] = [];

  const existing = await prisma.trade.findMany({
    where: { userId: user.id },
    select: { tradeDate: true, symbol: true, entryPrice: true, positionSize: true },
  });
  const existingKeys = new Set(
    existing.map((t) => dupKey(t.tradeDate.toISOString().slice(0, 10), t.symbol, Number(t.entryPrice), Number(t.positionSize))),
  );

  const seen = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = parseRow(row, mapping);
    if ("error" in parsed) {
      errors.push({ row: index + 1, message: parsed.error });
      return;
    }

    const key = dupKey(parsed.tradeDate, parsed.symbol, parsed.entryPrice, parsed.positionSize);
    const duplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);

    preview.push({
      row: index + 1,
      tradeDate: parsed.tradeDate,
      symbol: parsed.symbol,
      direction: parsed.direction,
      netPnl: parsed.netPnl,
      duplicate,
    });
  });

  return { preview, errors };
}

export async function importTrades(
  rows: ImportRow[],
  mapping: Mapping,
  options: { skipDuplicates: boolean },
): Promise<ImportResult> {
  const user = await requireUser();

  const [instruments, setups, strategies, sessions, existing] = await Promise.all([
    prisma.instrument.findMany({ where: { userId: user.id } }),
    prisma.setup.findMany({ where: { userId: user.id } }),
    prisma.strategy.findMany({ where: { userId: user.id } }),
    prisma.tradingSession.findMany({ where: { userId: user.id } }),
    prisma.trade.findMany({
      where: { userId: user.id },
      select: { tradeDate: true, symbol: true, entryPrice: true, positionSize: true },
    }),
  ]);

  const existingKeys = new Set(
    existing.map((t) =>
      dupKey(t.tradeDate.toISOString().slice(0, 10), t.symbol, Number(t.entryPrice), Number(t.positionSize)),
    ),
  );

  const byName = <T extends { id: string; name: string }>(list: T[], name: string | null) =>
    name ? (list.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id ?? null) : null;

  const result: ImportResult = { imported: 0, skipped: 0, duplicates: 0, errors: [] };
  const toCreate: Prisma.TradeCreateManyInput[] = [];

  for (const [index, row] of rows.entries()) {
    const parsed = parseRow(row, mapping);
    if ("error" in parsed) {
      result.errors.push({ row: index + 1, message: parsed.error });
      result.skipped += 1;
      continue;
    }

    const key = dupKey(parsed.tradeDate, parsed.symbol, parsed.entryPrice, parsed.positionSize);
    if (existingKeys.has(key)) {
      result.duplicates += 1;
      if (options.skipDuplicates) continue;
    }
    existingKeys.add(key);

    const instrument = instruments.find((i) => i.symbol === parsed.symbol);
    const pointValue =
      instrument?.tickSize && instrument?.tickValue && Number(instrument.tickSize) !== 0
        ? Number(instrument.tickValue) / Number(instrument.tickSize)
        : null;

    const calc = calculateTrade({
      direction: parsed.direction,
      positionSize: parsed.positionSize,
      entryPrice: parsed.entryPrice,
      exitPrice: parsed.exitPrice,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      fees: parsed.fees ?? 0,
      pointValue,
    });

    const netPnl = parsed.netPnl !== null ? parsed.netPnl : calc.netPnl;
    const rMultiple =
      calc.riskAmount && calc.riskAmount > 0
        ? Math.round((netPnl / calc.riskAmount) * 10000) / 10000
        : null;

    const entryTime = new Date(`${parsed.tradeDate}T${parsed.entryTime ?? "00:00"}:00.000Z`);
    const exitTime = parsed.exitTime
      ? new Date(`${parsed.tradeDate}T${parsed.exitTime}:00.000Z`)
      : null;
    if (exitTime && exitTime < entryTime) exitTime.setUTCDate(exitTime.getUTCDate() + 1);

    toCreate.push({
      userId: user.id,
      tradeDate: new Date(`${parsed.tradeDate}T00:00:00.000Z`),
      entryTime,
      exitTime,
      instrumentId: instrument?.id ?? null,
      symbol: parsed.symbol,
      market: parsed.market ?? instrument?.market ?? "FUTURES",
      direction: parsed.direction,
      positionSize: parsed.positionSize,
      entryPrice: parsed.entryPrice,
      exitPrice: parsed.exitPrice,
      stopLoss: parsed.stopLoss,
      takeProfit: parsed.takeProfit,
      grossPnl: parsed.netPnl !== null ? parsed.netPnl + (parsed.fees ?? 0) : calc.grossPnl,
      fees: calc.fees,
      netPnl,
      riskAmount: calc.riskAmount,
      rewardAmount: calc.rewardAmount,
      plannedRr: calc.plannedRr,
      rMultiple,
      pnlPercent: calc.pnlPercent,
      result: netPnl > 0.0001 ? "WIN" : netPnl < -0.0001 ? "LOSS" : "BREAKEVEN",
      manualPnl: parsed.netPnl !== null,
      setupId: byName(setups, parsed.setup),
      strategyId: byName(strategies, parsed.strategy),
      sessionId: byName(sessions, parsed.session),
      notes: parsed.notes,
    });
  }

  if (toCreate.length) {
    // Chunked so a very large CSV does not exceed statement limits.
    for (let i = 0; i < toCreate.length; i += 200) {
      const chunk = toCreate.slice(i, i + 200);
      const created = await prisma.trade.createMany({ data: chunk });
      result.imported += created.count;
    }
  }

  revalidatePath("/", "layout");
  return result;
}

type ParsedRow = {
  tradeDate: string;
  symbol: string;
  direction: string;
  positionSize: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  fees: number | null;
  netPnl: number | null;
  entryTime: string | null;
  exitTime: string | null;
  market: string | null;
  setup: string | null;
  strategy: string | null;
  session: string | null;
  notes: string | null;
};

function parseRow(row: ImportRow, mapping: Mapping): ParsedRow | { error: string } {
  const value = (field: string) => {
    const column = mapping[field];
    if (!column) return null;
    const raw = row[column];
    return raw === undefined || raw === null || raw.trim() === "" ? null : raw.trim();
  };

  const tradeDate = normalizeDate(value("tradeDate"));
  if (!tradeDate) return { error: "Missing or unrecognised trade date" };

  const symbol = value("symbol")?.toUpperCase();
  if (!symbol) return { error: "Missing instrument" };

  const direction = normalizeDirection(value("direction"));
  if (!direction) return { error: "Direction must be long or short" };

  const positionSize = toNumber(value("positionSize"));
  if (positionSize === null || positionSize <= 0) return { error: "Position size must be a positive number" };

  const entryPrice = toNumber(value("entryPrice"));
  if (entryPrice === null) return { error: "Entry price must be a number" };

  return {
    tradeDate,
    symbol,
    direction,
    positionSize,
    entryPrice,
    exitPrice: toNumber(value("exitPrice")),
    stopLoss: toNumber(value("stopLoss")),
    takeProfit: toNumber(value("takeProfit")),
    fees: toNumber(value("fees")),
    netPnl: toNumber(value("netPnl")),
    entryTime: normalizeTime(value("entryTime")),
    exitTime: normalizeTime(value("exitTime")),
    market: value("market")?.toUpperCase() ?? null,
    setup: value("setup"),
    strategy: value("strategy"),
    session: value("session"),
    notes: value("notes"),
  };
}

function toNumber(value: string | null) {
  if (value === null) return null;
  // Tolerate currency symbols, thousands separators and parenthesised negatives.
  const cleaned = value.replace(/[$£€\s,]/g, "").replace(/^\((.*)\)$/, "-$1");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: string | null) {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Accept M/D/YYYY and D/M/YYYY — ambiguous values fall back to month-first.
  const slash = value.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (slash) {
    let [, a, b, year] = slash;
    if (year.length === 2) year = `20${year}`;
    let month = a;
    let day = b;
    if (Number(a) > 12) {
      month = b;
      day = a;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeTime(value: string | null) {
  if (!value) return null;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeDirection(value: string | null) {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (["long", "buy", "b", "l"].includes(lower)) return "LONG";
  if (["short", "sell", "s"].includes(lower)) return "SHORT";
  return null;
}

const dupKey = (date: string, symbol: string, entry: number, size: number) =>
  `${date}|${symbol}|${entry}|${size}`;
