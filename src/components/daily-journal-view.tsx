"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save } from "lucide-react";
import { saveDailyJournal, type JournalState } from "@/lib/actions/journal";
import { formatDate, formatPercent, formatR, formatSignedCurrency } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/primitives";
import { StatCard, toneOf } from "@/components/stat-card";
import { cn } from "@/lib/utils";

type Journal = {
  followedPlan: boolean | null;
  didWell: string | null;
  mistakesMade: string | null;
  biggestLesson: string | null;
  improveTomorrow: string | null;
  psychologyNotes: string | null;
  overtraded: boolean | null;
  rating: number | null;
  notes: string | null;
};

export function DailyJournalView({
  date,
  currency,
  metrics,
  bestTrade,
  worstTrade,
  tradesList,
  journal,
  recent,
}: {
  date: string;
  currency: string;
  metrics: {
    netPnl: number;
    trades: number;
    winRate: number;
    avgR: number;
    totalR: number;
    wins: number;
    losses: number;
  };
  bestTrade: { id: string; symbol: string; netPnl: number } | null;
  worstTrade: { id: string; symbol: string; netPnl: number } | null;
  tradesList: {
    id: string;
    symbol: string;
    direction: string;
    netPnl: number;
    rMultiple: number | null;
    setupName: string | null;
  }[];
  journal: Journal | null;
  recent: { date: string; rating: number | null; followedPlan: boolean | null }[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<JournalState, FormData>(
    saveDailyJournal,
    undefined,
  );

  const shift = (days: number) => {
    const next = new Date(`${date}T00:00:00.000Z`);
    next.setUTCDate(next.getUTCDate() + days);
    router.push(`/journal?date=${next.toISOString().slice(0, 10)}`);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
      <div className="space-y-4">
        {/* Day picker */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Previous day"
            >
              <ChevronLeft size={17} />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold">{formatDate(date, { weekday: "long" })}</p>
              <input
                type="date"
                value={date}
                onChange={(e) => router.push(`/journal?date=${e.target.value}`)}
                className="field mt-1.5 py-1 text-center text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => shift(1)}
              className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Next day"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </Card>

        {/* Auto summary */}
        <Card>
          <CardHeader title="Day summary" subtitle="Calculated from the trades logged on this date" />
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
            <StatCard
              label="Net P&L"
              value={formatSignedCurrency(metrics.netPnl, currency)}
              tone={toneOf(metrics.netPnl)}
            />
            <StatCard label="Trades" value={metrics.trades} />
            <StatCard label="Win rate" value={formatPercent(metrics.winRate)} size="sm" />
            <StatCard label="Avg R" value={formatR(metrics.avgR)} tone={toneOf(metrics.avgR)} size="sm" />
            <StatCard
              label="Best trade"
              value={bestTrade ? formatSignedCurrency(bestTrade.netPnl, currency) : "—"}
              hint={bestTrade?.symbol}
              tone="up"
              size="sm"
            />
            <StatCard
              label="Worst trade"
              value={worstTrade ? formatSignedCurrency(worstTrade.netPnl, currency) : "—"}
              hint={worstTrade?.symbol}
              tone="down"
              size="sm"
            />
          </div>
        </Card>

        {/* Trades on the day */}
        <Card className="overflow-hidden">
          <CardHeader title="Trades this day" subtitle={`${tradesList.length} logged`} />
          {tradesList.length ? (
            <ul className="divide-y divide-line-soft">
              {tradesList.map((trade) => (
                <li key={trade.id}>
                  <Link
                    href={`/trades/${trade.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {trade.symbol}{" "}
                        <span className="text-xs font-normal text-ink-faint">
                          {trade.direction === "LONG" ? "Long" : "Short"}
                        </span>
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">{trade.setupName ?? "No setup"}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "num text-sm font-semibold",
                          trade.netPnl > 0
                            ? "text-up"
                            : trade.netPnl < 0
                              ? "text-down"
                              : "text-ink-muted",
                        )}
                      >
                        {formatSignedCurrency(trade.netPnl, currency)}
                      </p>
                      <p className="num text-[11px] text-ink-faint">{formatR(trade.rMultiple)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-ink-faint">
              No trades logged on this date
            </p>
          )}
        </Card>

        {/* Recent entries */}
        <Card className="overflow-hidden">
          <CardHeader title="Recent entries" />
          <div className="flex flex-wrap gap-1.5 px-5 pb-5">
            {recent.length ? (
              recent.map((entry) => (
                <Link
                  key={entry.date}
                  href={`/journal?date=${entry.date}`}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] transition-colors",
                    entry.date === date
                      ? "border-accent/40 bg-accent/12 text-accent"
                      : "border-line text-ink-muted hover:text-ink",
                  )}
                >
                  {entry.date.slice(5)}
                  {entry.rating !== null ? (
                    <span className="ml-1 text-ink-faint">{entry.rating}/10</span>
                  ) : null}
                </Link>
              ))
            ) : (
              <p className="text-xs text-ink-faint">No journal entries yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* The review form */}
      <form action={formAction}>
        <input type="hidden" name="date" value={date} />
        <Card>
          <CardHeader
            title="End of day review"
            subtitle={formatDate(date, { weekday: "long" })}
            action={
              state?.success ? (
                <span className="flex items-center gap-1 text-xs text-up">
                  <CheckCircle2 size={13} /> {state.success}
                </span>
              ) : null
            }
          />

          <div className="space-y-4 px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="followedPlan">
                  Did I follow my trading plan today?
                </label>
                <select
                  id="followedPlan"
                  name="followedPlan"
                  defaultValue={
                    journal?.followedPlan === true ? "yes" : journal?.followedPlan === false ? "no" : ""
                  }
                  className="field"
                >
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="overtraded">
                  Did I overtrade?
                </label>
                <select
                  id="overtraded"
                  name="overtraded"
                  defaultValue={
                    journal?.overtraded === true ? "yes" : journal?.overtraded === false ? "no" : ""
                  }
                  className="field"
                >
                  <option value="">—</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <Question
              name="didWell"
              label="What did I do well today?"
              defaultValue={journal?.didWell}
            />
            <Question
              name="mistakesMade"
              label="What mistakes did I make?"
              defaultValue={journal?.mistakesMade}
            />
            <Question
              name="biggestLesson"
              label="What is the biggest lesson from today?"
              defaultValue={journal?.biggestLesson}
            />
            <Question
              name="improveTomorrow"
              label="What should I improve tomorrow?"
              defaultValue={journal?.improveTomorrow}
            />
            <Question
              name="psychologyNotes"
              label="How was my psychology?"
              defaultValue={journal?.psychologyNotes}
            />
            <Question name="notes" label="Anything else" defaultValue={journal?.notes} rows={3} />

            <RatingInput defaultValue={journal?.rating ?? null} />

            {state?.error ? (
              <p className="rounded-lg border border-down/25 bg-down-soft px-3 py-2 text-xs text-down">
                {state.error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-line px-5 py-4">
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save daily review
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Question({
  name,
  label,
  defaultValue,
  rows = 3,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="field resize-y leading-relaxed"
      />
    </div>
  );
}

function RatingInput({ defaultValue }: { defaultValue: number | null }) {
  return (
    <div>
      <p className="label">Rate the day (1–10)</p>
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
          <label key={value} className="cursor-pointer">
            <input
              type="radio"
              name="rating"
              value={value}
              defaultChecked={defaultValue === value}
              className="peer sr-only"
            />
            <span
              className={cn(
                "num flex h-8 w-8 items-center justify-center rounded-md border border-line text-xs transition-colors",
                "peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-accent",
                "hover:border-accent/40",
              )}
            >
              {value}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
