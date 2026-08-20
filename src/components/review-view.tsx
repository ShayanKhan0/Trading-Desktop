"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save, TrendingDown, TrendingUp } from "lucide-react";
import { savePeriodReview, type JournalState } from "@/lib/actions/journal";
import type { Breakdown } from "@/lib/metrics";
import { formatCurrency, formatDate, formatPercent, formatR, formatRatio, formatSignedCurrency } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/primitives";
import { StatCard, toneOf } from "@/components/stat-card";
import { EquityChart } from "@/components/charts/equity-chart";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { cn } from "@/lib/utils";

type DayStat = { date: string; netPnl: number; trades: number };

export function ReviewView({
  period,
  periodStart,
  periodEnd,
  currency,
  metrics,
  previous,
  equity,
  daily,
  setups,
  instruments,
  mistakes,
  weekdays,
  bestDay,
  worstDay,
  review,
}: {
  period: "WEEKLY" | "MONTHLY";
  periodStart: string;
  periodEnd: string;
  currency: string;
  metrics: {
    netPnl: number;
    trades: number;
    winRate: number;
    totalR: number;
    avgR: number;
    profitFactor: number;
    expectancy: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    avgWin: number;
    avgLoss: number;
  };
  previous: {
    netPnl: number;
    trades: number;
    winRate: number;
    totalR: number;
    profitFactor: number;
  };
  equity: Parameters<typeof EquityChart>[0]["points"];
  daily: DayStat[];
  setups: Breakdown[];
  instruments: Breakdown[];
  mistakes: (Breakdown & { shareOfTrades?: number })[];
  weekdays: Breakdown[];
  bestDay: DayStat | null;
  worstDay: DayStat | null;
  review: {
    wentWell: string | null;
    wentWrong: string | null;
    biggestMistake: string | null;
    bestSetup: string | null;
    worstSetup: string | null;
    lessons: string | null;
    nextFocus: string | null;
    rating: number | null;
  } | null;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<JournalState, FormData>(
    savePeriodReview,
    undefined,
  );

  const navigate = (nextPeriod: "WEEKLY" | "MONTHLY", start: string) => {
    router.push(`/reviews?period=${nextPeriod}&start=${start}`);
  };

  const shift = (delta: number) => {
    const start = new Date(`${periodStart}T00:00:00.000Z`);
    if (period === "WEEKLY") start.setUTCDate(start.getUTCDate() + delta * 7);
    else start.setUTCMonth(start.getUTCMonth() + delta);
    navigate(period, start.toISOString().slice(0, 10));
  };

  const bestSetup = setups[0];
  const worstSetup = setups[setups.length - 1];
  const topMistake = [...mistakes].sort((a, b) => b.trades - a.trades)[0];
  const topInstrument = instruments[0];

  const delta = (current: number, prior: number) => {
    if (prior === 0 && current === 0) return null;
    return current - prior;
  };

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface p-1">
          {(["WEEKLY", "MONTHLY"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => navigate(option, periodStart)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                period === option
                  ? "bg-accent/15 text-accent"
                  : "text-ink-faint hover:bg-surface-2 hover:text-ink",
              )}
            >
              {option === "WEEKLY" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Previous period"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[13rem] text-center text-sm font-medium">
            {formatDate(periodStart)} – {formatDate(periodEnd)}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Next period"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label={period === "WEEKLY" ? "Weekly P&L" : "Monthly P&L"}
          value={formatSignedCurrency(metrics.netPnl, currency)}
          tone={toneOf(metrics.netPnl)}
          hint={<Delta value={delta(metrics.netPnl, previous.netPnl)} currency={currency} />}
        />
        <StatCard
          label="Win rate"
          value={formatPercent(metrics.winRate)}
          hint={<Delta value={delta(metrics.winRate, previous.winRate)} suffix="pp" />}
        />
        <StatCard label="Trades" value={metrics.trades} hint={<Delta value={delta(metrics.trades, previous.trades)} />} />
        <StatCard label="Total R" value={formatR(metrics.totalR)} tone={toneOf(metrics.totalR)} />
        <StatCard
          label="Profit factor"
          value={formatRatio(metrics.profitFactor)}
          tone={metrics.profitFactor >= 1 ? "up" : "down"}
        />
        <StatCard
          label="Max drawdown"
          value={formatCurrency(-metrics.maxDrawdown, currency)}
          tone="down"
          hint={formatPercent(metrics.maxDrawdownPercent)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Equity curve" subtitle="Within this period" />
          <EquityChart points={equity} daily={daily} currency={currency} height={260} />
        </Card>

        <Card>
          <CardHeader title="Period highlights" />
          <dl className="divide-y divide-line-soft">
            <Row label="Best setup" value={bestSetup ? `${bestSetup.label} · ${formatSignedCurrency(bestSetup.netPnl, currency)}` : "—"} />
            <Row
              label="Worst setup"
              value={
                worstSetup && worstSetup.key !== bestSetup?.key
                  ? `${worstSetup.label} · ${formatSignedCurrency(worstSetup.netPnl, currency)}`
                  : "—"
              }
            />
            <Row
              label="Most profitable instrument"
              value={topInstrument ? `${topInstrument.label} · ${formatSignedCurrency(topInstrument.netPnl, currency)}` : "—"}
            />
            <Row
              label="Most frequent mistake"
              value={topMistake ? `${topMistake.label} · ${topMistake.trades}×` : "None logged"}
            />
            <Row
              label="Best day"
              value={bestDay ? `${formatDate(bestDay.date)} · ${formatSignedCurrency(bestDay.netPnl, currency)}` : "—"}
            />
            <Row
              label="Worst day"
              value={worstDay ? `${formatDate(worstDay.date)} · ${formatSignedCurrency(worstDay.netPnl, currency)}` : "—"}
            />
            <Row label="Average winner" value={formatCurrency(metrics.avgWin, currency)} />
            <Row label="Average loser" value={formatCurrency(metrics.avgLoss, currency)} />
            <Row label="Expectancy" value={formatSignedCurrency(metrics.expectancy, currency)} />
            <Row label="Average R" value={formatR(metrics.avgR)} />
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader title="Net P&L by setup" />
          <BreakdownBarChart rows={setups.slice(0, 8)} metric="netPnl" currency={currency} height={240} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Net P&L by instrument" />
          <BreakdownBarChart rows={instruments.slice(0, 8)} metric="netPnl" currency={currency} height={240} />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Net P&L by day of week" />
          <BreakdownBarChart rows={weekdays} metric="netPnl" currency={currency} height={240} layout="horizontal" />
        </Card>
      </div>

      {/* Reflection form */}
      <form action={formAction}>
        <input type="hidden" name="period" value={period} />
        <input type="hidden" name="periodStart" value={periodStart} />

        <Card>
          <CardHeader
            title={period === "WEEKLY" ? "Weekly reflection" : "Monthly reflection"}
            subtitle="The numbers above are the evidence — this is the interpretation."
            action={
              state?.success ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle2 size={13} /> {state.success}
                </span>
              ) : null
            }
          />

          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
            <Question name="wentWell" label="What went well?" defaultValue={review?.wentWell} />
            <Question name="wentWrong" label="What went wrong?" defaultValue={review?.wentWrong} />
            <Question
              name="biggestMistake"
              label="Biggest mistake"
              defaultValue={review?.biggestMistake ?? topMistake?.label ?? null}
            />
            <Question
              name="bestSetup"
              label="Best performing setup"
              defaultValue={review?.bestSetup ?? bestSetup?.label ?? null}
            />
            <Question
              name="worstSetup"
              label="Worst performing setup"
              defaultValue={review?.worstSetup ?? worstSetup?.label ?? null}
            />
            <Question name="lessons" label="Lessons learned" defaultValue={review?.lessons} />
            <div className="sm:col-span-2">
              <Question
                name="nextFocus"
                label={period === "WEEKLY" ? "Focus for next week" : "Focus for next month"}
                defaultValue={review?.nextFocus}
              />
            </div>

            <div className="sm:col-span-2">
              <p className="label">Rate the period (1–10)</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      defaultChecked={review?.rating === value}
                      className="peer sr-only"
                    />
                    <span className="num flex h-8 w-8 items-center justify-center rounded-md border border-line text-xs transition-colors peer-checked:border-accent peer-checked:bg-accent/15 peer-checked:text-accent hover:border-accent/40">
                      {value}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {state?.error ? (
            <p className="mx-5 mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {state.error}
            </p>
          ) : null}

          <div className="border-t border-line px-5 py-4">
            <button type="submit" disabled={pending} className="btn btn-primary">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save review
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="text-right text-xs font-medium">{value}</dd>
    </div>
  );
}

function Question({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        className="field resize-y leading-relaxed"
      />
    </div>
  );
}

function Delta({
  value,
  currency,
  suffix,
}: {
  value: number | null;
  currency?: string;
  suffix?: string;
}) {
  if (value === null) return <span>vs previous period</span>;

  const formatted = currency
    ? formatSignedCurrency(value, currency, true)
    : `${value > 0 ? "+" : ""}${value.toFixed(suffix === "pp" ? 1 : 0)}${suffix ?? ""}`;

  return (
    <span className={cn("inline-flex items-center gap-0.5", value >= 0 ? "text-emerald-400" : "text-rose-400")}>
      {value >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {formatted} vs previous
    </span>
  );
}
