"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { calculateTrade } from "@/lib/calc";

export type TradeFormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "" || value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

const optionalString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  });

const optionalScore = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "" || value === null) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(1, Math.min(10, Math.round(parsed)));
  });

const tradeSchema = z.object({
  tradeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A valid trade date is required"),
  entryTime: z.string().optional(),
  exitTime: z.string().optional(),
  symbol: z.string().min(1, "Instrument is required").max(24),
  market: z.string().default("FUTURES"),
  direction: z.enum(["LONG", "SHORT"]),
  positionSize: z.coerce.number().positive("Position size must be greater than zero"),
  entryPrice: z.coerce.number().refine((v) => Number.isFinite(v), "Entry price is required"),
  exitPrice: optionalNumber,
  stopLoss: optionalNumber,
  takeProfit: optionalNumber,
  fees: optionalNumber,
  manualGrossPnl: optionalNumber,
  manualNetPnl: optionalNumber,
  instrumentId: optionalString,
  strategyId: optionalString,
  setupId: optionalString,
  sessionId: optionalString,
  marketCondition: optionalString,
  confidenceBefore: optionalScore,
  emotionBefore: optionalString,
  emotionAfter: optionalString,
  followedPlan: optionalString,
  setupQuality: optionalScore,
  executionQuality: optionalScore,
  disciplineScore: optionalScore,
  thesis: optionalString,
  reasonEntry: optionalString,
  reasonExit: optionalString,
  whatWentWell: optionalString,
  whatWentWrong: optionalString,
  lesson: optionalString,
  notes: optionalString,
});

function readForm(formData: FormData) {
  const get = (key: string) => {
    const value = formData.get(key);
    return value === null ? undefined : String(value);
  };

  return tradeSchema.safeParse({
    tradeDate: get("tradeDate") ?? "",
    entryTime: get("entryTime"),
    exitTime: get("exitTime"),
    symbol: (get("symbol") ?? "").trim().toUpperCase(),
    market: get("market") ?? "FUTURES",
    direction: get("direction") ?? "LONG",
    positionSize: get("positionSize") ?? "",
    entryPrice: get("entryPrice") ?? "",
    exitPrice: get("exitPrice"),
    stopLoss: get("stopLoss"),
    takeProfit: get("takeProfit"),
    fees: get("fees"),
    manualGrossPnl: get("manualGrossPnl"),
    manualNetPnl: get("manualNetPnl"),
    instrumentId: get("instrumentId"),
    strategyId: get("strategyId"),
    setupId: get("setupId"),
    sessionId: get("sessionId"),
    marketCondition: get("marketCondition"),
    confidenceBefore: get("confidenceBefore"),
    emotionBefore: get("emotionBefore"),
    emotionAfter: get("emotionAfter"),
    followedPlan: get("followedPlan"),
    setupQuality: get("setupQuality"),
    executionQuality: get("executionQuality"),
    disciplineScore: get("disciplineScore"),
    thesis: get("thesis"),
    reasonEntry: get("reasonEntry"),
    reasonExit: get("reasonExit"),
    whatWentWell: get("whatWentWell"),
    whatWentWrong: get("whatWentWrong"),
    lesson: get("lesson"),
    notes: get("notes"),
  });
}

async function buildTradeData(userId: string, data: z.infer<typeof tradeSchema>) {
  // Resolve the instrument so futures point values feed the P&L maths.
  let pointValue: number | null = null;
  let instrumentId = data.instrumentId;

  if (instrumentId) {
    const instrument = await prisma.instrument.findFirst({
      where: { id: instrumentId, userId },
    });
    if (instrument) {
      if (instrument.tickSize && instrument.tickValue && Number(instrument.tickSize) !== 0) {
        pointValue = Number(instrument.tickValue) / Number(instrument.tickSize);
      }
    } else {
      instrumentId = null;
    }
  }

  if (!instrumentId) {
    const match = await prisma.instrument.findFirst({ where: { userId, symbol: data.symbol } });
    if (match) {
      instrumentId = match.id;
      if (match.tickSize && match.tickValue && Number(match.tickSize) !== 0) {
        pointValue = Number(match.tickValue) / Number(match.tickSize);
      }
    }
  }

  const calc = calculateTrade({
    direction: data.direction,
    positionSize: data.positionSize,
    entryPrice: data.entryPrice,
    exitPrice: data.exitPrice,
    stopLoss: data.stopLoss,
    takeProfit: data.takeProfit,
    fees: data.fees ?? 0,
    pointValue,
    manualGrossPnl: data.manualGrossPnl,
  });

  // A manual net P&L overrides the derived figure entirely.
  const manualNet = data.manualNetPnl;
  const netPnl = manualNet !== null ? manualNet : calc.netPnl;
  const rMultiple =
    calc.riskAmount && calc.riskAmount > 0
      ? Math.round((netPnl / calc.riskAmount) * 10000) / 10000
      : null;

  const entryTime = combineDateTime(data.tradeDate, data.entryTime);
  const exitTime = data.exitTime ? combineDateTime(data.tradeDate, data.exitTime, entryTime) : null;

  return {
    userId,
    tradeDate: new Date(`${data.tradeDate}T00:00:00.000Z`),
    entryTime,
    exitTime,
    instrumentId,
    symbol: data.symbol,
    market: data.market,
    direction: data.direction,
    positionSize: data.positionSize,
    entryPrice: data.entryPrice,
    exitPrice: data.exitPrice,
    stopLoss: data.stopLoss,
    takeProfit: data.takeProfit,
    grossPnl: manualNet !== null ? manualNet + (data.fees ?? 0) : calc.grossPnl,
    fees: calc.fees,
    netPnl,
    riskAmount: calc.riskAmount,
    rewardAmount: calc.rewardAmount,
    plannedRr: calc.plannedRr,
    rMultiple,
    pnlPercent: calc.pnlPercent,
    result: netPnl > 0.0001 ? "WIN" : netPnl < -0.0001 ? "LOSS" : "BREAKEVEN",
    manualPnl: manualNet !== null || data.manualGrossPnl !== null,
    strategyId: data.strategyId,
    setupId: data.setupId,
    sessionId: data.sessionId,
    marketCondition: data.marketCondition,
    confidenceBefore: data.confidenceBefore,
    emotionBefore: data.emotionBefore,
    emotionAfter: data.emotionAfter,
    followedPlan: data.followedPlan === "yes" ? true : data.followedPlan === "no" ? false : null,
    setupQuality: data.setupQuality,
    executionQuality: data.executionQuality,
    disciplineScore: data.disciplineScore,
    thesis: data.thesis,
    reasonEntry: data.reasonEntry,
    reasonExit: data.reasonExit,
    whatWentWell: data.whatWentWell,
    whatWentWrong: data.whatWentWrong,
    lesson: data.lesson,
    notes: data.notes,
  };
}

/** Times are stored in UTC; an exit before the entry rolls to the next day. */
function combineDateTime(date: string, time: string | undefined, after?: Date) {
  const safeTime = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : "00:00";
  const result = new Date(`${date}T${safeTime}:00.000Z`);
  if (after && result < after) result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

export async function createTrade(_prev: TradeFormState, formData: FormData): Promise<TradeFormState> {
  const user = await requireUser();
  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = await buildTradeData(user.id, parsed.data);
  const tagIds = readIds(formData, "tagIds");
  const mistakeIds = readIds(formData, "mistakeIds");
  const confluenceIds = readIds(formData, "confluenceIds");
  const images = readImages(formData);

  const trade = await prisma.trade.create({
    data: {
      ...data,
      tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      mistakes: mistakeIds.length
        ? { create: mistakeIds.map((mistakeId) => ({ mistakeId })) }
        : undefined,
      confluences: confluenceIds.length
        ? { create: confluenceIds.map((confluenceId) => ({ confluenceId })) }
        : undefined,
      images: images.length ? { create: images } : undefined,
    },
    select: { id: true },
  });

  revalidatePath("/", "layout");
  redirect(`/trades/${trade.id}`);
}

export async function updateTrade(_prev: TradeFormState, formData: FormData): Promise<TradeFormState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing trade id" };

  const existing = await prisma.trade.findFirst({ where: { id, userId: user.id } });
  if (!existing) return { error: "Trade not found" };

  const parsed = readForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const data = await buildTradeData(user.id, parsed.data);
  const tagIds = readIds(formData, "tagIds");
  const mistakeIds = readIds(formData, "mistakeIds");
  const confluenceIds = readIds(formData, "confluenceIds");
  const images = readImages(formData);

  await prisma.$transaction([
    prisma.tradeTag.deleteMany({ where: { tradeId: id } }),
    prisma.tradeMistake.deleteMany({ where: { tradeId: id } }),
    prisma.tradeConfluence.deleteMany({ where: { tradeId: id } }),
    prisma.trade.update({
      where: { id },
      data: {
        ...data,
        tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
        mistakes: mistakeIds.length
          ? { create: mistakeIds.map((mistakeId) => ({ mistakeId })) }
          : undefined,
        confluences: confluenceIds.length
          ? { create: confluenceIds.map((confluenceId) => ({ confluenceId })) }
          : undefined,
      },
    }),
  ]);

  if (images.length) {
    await prisma.tradeImage.createMany({
      data: images.map((image) => ({ ...image, tradeId: id })),
    });
  }

  revalidatePath("/", "layout");
  redirect(`/trades/${id}`);
}

export async function deleteTrade(id: string) {
  const user = await requireUser();
  await prisma.trade.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
  redirect("/trades");
}

export async function deleteTradeImage(imageId: string) {
  const user = await requireUser();
  const image = await prisma.tradeImage.findFirst({
    where: { id: imageId, trade: { userId: user.id } },
    select: { id: true, tradeId: true },
  });
  if (!image) return;

  await prisma.tradeImage.delete({ where: { id: image.id } });
  revalidatePath(`/trades/${image.tradeId}`);
}

function readIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

/** Screenshots arrive as data URLs from the client-side uploader. */
function readImages(formData: FormData) {
  const raw = formData.get("images");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw)) as {
      url: string;
      caption?: string;
      phase?: string;
    }[];
    return parsed
      .filter((image) => typeof image.url === "string" && image.url.startsWith("data:image/"))
      .slice(0, 12)
      .map((image, index) => ({
        url: image.url,
        caption: image.caption?.slice(0, 200) || null,
        phase: image.phase ?? "OTHER",
        sortOrder: index,
      }));
  } catch {
    return [];
  }
}
