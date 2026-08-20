"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { clearDemoData, generateDemoData } from "@/lib/seed";

export async function saveDashboardLayout(hidden: string[]) {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { dashboardLayout: { hidden } },
  });
  revalidatePath("/dashboard");
}

const accountSchema = z.object({
  name: z.string().max(80).optional(),
  startingBalance: z.coerce.number().min(0).max(1_000_000_000),
  currency: z.string().min(3).max(3),
  timezone: z.string().max(64),
});

export async function updateAccount(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = accountSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    startingBalance: formData.get("startingBalance"),
    currency: String(formData.get("currency") ?? "USD").toUpperCase(),
    timezone: String(formData.get("timezone") ?? "UTC"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Account settings saved" };
}

export async function loadDemoData() {
  const user = await requireUser();
  const result = await generateDemoData(user.id);
  revalidatePath("/", "layout");
  return result;
}

export async function removeDemoData() {
  const user = await requireUser();
  await clearDemoData(user.id);
  revalidatePath("/", "layout");
}

/* ---- Taxonomy management (instruments, strategies, setups, sessions, tags, mistakes) ---- */

type Entity = "instrument" | "strategy" | "setup" | "session" | "tag" | "mistake" | "confluence";

export async function createTaxonomyItem(_prev: unknown, formData: FormData) {
  const user = await requireUser();
  const entity = String(formData.get("entity")) as Entity;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };

  try {
    switch (entity) {
      case "instrument":
        await prisma.instrument.create({
          data: {
            userId: user.id,
            symbol: name.toUpperCase(),
            name: String(formData.get("description") ?? "").trim() || null,
            market: String(formData.get("market") ?? "FUTURES"),
            tickSize: numberOrNull(formData.get("tickSize")),
            tickValue: numberOrNull(formData.get("tickValue")),
          },
        });
        break;
      case "strategy":
        await prisma.strategy.create({
          data: {
            userId: user.id,
            name,
            description: String(formData.get("description") ?? "").trim() || null,
          },
        });
        break;
      case "setup":
        await prisma.setup.create({
          data: {
            userId: user.id,
            name,
            description: String(formData.get("description") ?? "").trim() || null,
            strategyId: String(formData.get("strategyId") ?? "") || null,
          },
        });
        break;
      case "session":
        await prisma.tradingSession.create({
          data: {
            userId: user.id,
            name,
            startHour: Number(formData.get("startHour") ?? 0),
            endHour: Number(formData.get("endHour") ?? 23),
          },
        });
        break;
      case "tag":
        await prisma.tag.create({
          data: {
            userId: user.id,
            name,
            color: String(formData.get("color") ?? "slate"),
          },
        });
        break;
      case "mistake":
        await prisma.mistakeType.create({ data: { userId: user.id, name } });
        break;
      case "confluence":
        await prisma.confluence.create({
          data: {
            userId: user.id,
            name,
            description: String(formData.get("description") ?? "").trim() || null,
          },
        });
        break;
      default:
        return { error: "Unknown item type" };
    }
  } catch {
    return { error: `"${name}" already exists` };
  }

  revalidatePath("/settings");
  return { success: `${name} added` };
}

export async function deleteTaxonomyItem(entity: Entity, id: string) {
  const user = await requireUser();
  const where = { id, userId: user.id };

  switch (entity) {
    case "instrument":
      await prisma.instrument.deleteMany({ where });
      break;
    case "strategy":
      await prisma.strategy.deleteMany({ where });
      break;
    case "setup":
      await prisma.setup.deleteMany({ where });
      break;
    case "session":
      await prisma.tradingSession.deleteMany({ where });
      break;
    case "tag":
      await prisma.tag.deleteMany({ where });
      break;
    case "mistake":
      await prisma.mistakeType.deleteMany({ where });
      break;
    case "confluence":
      await prisma.confluence.deleteMany({ where });
      break;
  }

  revalidatePath("/settings");
}

const numberOrNull = (value: FormDataEntryValue | null) => {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
