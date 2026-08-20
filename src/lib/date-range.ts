export const RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "3-months", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
] as const;

export type RangeValue = (typeof RANGE_PRESETS)[number]["value"];

export const toISODate = (date: Date) => date.toISOString().slice(0, 10);

/** Resolves a preset (or explicit from/to) into inclusive yyyy-MM-dd bounds in UTC. */
export function resolveRange(
  range: string | undefined,
  from?: string,
  to?: string,
  now = new Date(),
): { from: string | null; to: string | null; label: string } {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const preset = RANGE_PRESETS.find((p) => p.value === range);

  if (range === "custom" || (!preset && (from || to))) {
    return { from: from ?? null, to: to ?? null, label: "Custom range" };
  }

  switch (range) {
    case "today":
      return { from: toISODate(today), to: toISODate(today), label: "Today" };
    case "week": {
      const day = today.getUTCDay();
      const diff = day === 0 ? 6 : day - 1; // week starts Monday
      const start = new Date(today);
      start.setUTCDate(today.getUTCDate() - diff);
      return { from: toISODate(start), to: toISODate(today), label: "This week" };
    }
    case "last-month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { from: toISODate(start), to: toISODate(end), label: "Last month" };
    }
    case "3-months": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 2, 1));
      return { from: toISODate(start), to: toISODate(today), label: "Last 3 months" };
    }
    case "year": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return { from: toISODate(start), to: toISODate(today), label: "This year" };
    }
    case "all":
      return { from: null, to: null, label: "All time" };
    case "month":
    default: {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { from: toISODate(start), to: toISODate(today), label: "This month" };
    }
  }
}

export function startOfWeek(date: Date) {
  const day = date.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diff);
  return start;
}

export function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Builds the 6x7 grid of a month view, padded to whole weeks (Mon–Sun). */
export function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const start = startOfWeek(first);
  const days: Date[] = [];
  for (let i = 0; i < 42; i += 1) days.push(addDays(start, i));
  return days;
}
