"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type GoalState = { error?: string; success?: string } | undefined;

const goalSchema = z.object({
  title: z.string().min(1, "Give the goal a title").max(120),
  metric: z.enum([
    "NET_PNL",
    "WIN_RATE",
    "TRADE_COUNT",
    "MAX_LOSS",
    "AVG_R",
    "TOTAL_R",
    "DISCIPLINE",
    "JOURNAL_COMPLETION",
  ]),
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  target: z.coerce.number(),
  direction: z.enum(["AT_LEAST", "AT_MOST"]),
  notes: z.string().max(400).optional(),
});

export async function createGoal(_prev: GoalState, formData: FormData): Promise<GoalState> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse({
    title: String(formData.get("title") ?? "").trim(),
    metric: String(formData.get("metric") ?? "NET_PNL"),
    period: String(formData.get("period") ?? "MONTHLY"),
    target: formData.get("target"),
    direction: String(formData.get("direction") ?? "AT_LEAST"),
    notes: String(formData.get("notes") ?? "").trim() || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.goal.create({ data: { ...parsed.data, userId: user.id } });
  revalidatePath("/goals");
  return { success: "Goal created" };
}

export async function toggleGoal(id: string, active: boolean) {
  const user = await requireUser();
  await prisma.goal.updateMany({ where: { id, userId: user.id }, data: { active } });
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const user = await requireUser();
  await prisma.goal.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/goals");
}
