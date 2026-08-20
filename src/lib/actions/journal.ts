"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type JournalState = { error?: string; success?: string } | undefined;

export async function saveDailyJournal(_prev: JournalState, formData: FormData): Promise<JournalState> {
  const user = await requireUser();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "A valid date is required" };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };
  const bool = (key: string) => {
    const value = String(formData.get(key) ?? "");
    return value === "yes" ? true : value === "no" ? false : null;
  };
  const rating = Number(formData.get("rating"));

  const data = {
    followedPlan: bool("followedPlan"),
    didWell: text("didWell"),
    mistakesMade: text("mistakesMade"),
    biggestLesson: text("biggestLesson"),
    improveTomorrow: text("improveTomorrow"),
    psychologyNotes: text("psychologyNotes"),
    overtraded: bool("overtraded"),
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 10 ? Math.round(rating) : null,
    notes: text("notes"),
  };

  await prisma.dailyJournal.upsert({
    where: { userId_date: { userId: user.id, date: new Date(`${date}T00:00:00.000Z`) } },
    create: { userId: user.id, date: new Date(`${date}T00:00:00.000Z`), ...data },
    update: data,
  });

  revalidatePath("/journal");
  return { success: "Daily review saved" };
}

export async function savePeriodReview(_prev: JournalState, formData: FormData): Promise<JournalState> {
  const user = await requireUser();
  const period = String(formData.get("period") ?? "WEEKLY");
  const periodStart = String(formData.get("periodStart") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return { error: "A valid period is required" };

  const text = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value || null;
  };
  const rating = Number(formData.get("rating"));

  const data = {
    wentWell: text("wentWell"),
    wentWrong: text("wentWrong"),
    biggestMistake: text("biggestMistake"),
    bestSetup: text("bestSetup"),
    worstSetup: text("worstSetup"),
    lessons: text("lessons"),
    nextFocus: text("nextFocus"),
    rating: Number.isFinite(rating) && rating >= 1 && rating <= 10 ? Math.round(rating) : null,
  };

  await prisma.periodReview.upsert({
    where: {
      userId_period_periodStart: {
        userId: user.id,
        period,
        periodStart: new Date(`${periodStart}T00:00:00.000Z`),
      },
    },
    create: {
      userId: user.id,
      period,
      periodStart: new Date(`${periodStart}T00:00:00.000Z`),
      ...data,
    },
    update: data,
  });

  revalidatePath("/reviews");
  return { success: "Review saved" };
}
