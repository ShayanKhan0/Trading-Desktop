"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, Power, Target, Trash2, XCircle } from "lucide-react";
import { createGoal, deleteGoal, toggleGoal, type GoalState } from "@/lib/actions/goals";
import type { GoalProgress } from "@/lib/goals";
import { GOAL_METRICS } from "@/lib/constants";
import { formatCurrency, formatPercent, formatR } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function GoalsView({
  progress,
  currency = "USD",
}: {
  progress: GoalProgress[];
  currency?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState<GoalState, FormData>(createGoal, undefined);
  const [, startTransition] = useTransition();

  const active = progress.filter((p) => p.goal.active);
  const inactive = progress.filter((p) => !p.goal.active);
  const met = active.filter((p) => p.met).length;

  const formatValue = (value: number, unit: GoalProgress["unit"]) => {
    switch (unit) {
      case "currency":
        return formatCurrency(value, currency);
      case "percent":
        return formatPercent(value);
      case "r":
        return formatR(value);
      case "score":
        return `${value.toFixed(1)}/10`;
      default:
        return String(Math.round(value));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {active.length ? (
            <>
              <span className="font-semibold text-ink">
                {met} of {active.length}
              </span>{" "}
              active goals currently on track
            </>
          ) : (
            "No active goals yet"
          )}
        </p>
        <button type="button" onClick={() => setShowForm((v) => !v)} className="btn btn-primary">
          <Plus size={15} /> New goal
        </button>
      </div>

      {showForm ? (
        <Card className="animate-fade-up">
          <CardHeader title="Create a goal" subtitle="Progress is measured over the goal's period" />
          <form action={formAction}>
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="label" htmlFor="title">
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="Maximum 3 trades per day"
                  className="field"
                />
              </div>

              <div>
                <label className="label" htmlFor="metric">
                  Metric
                </label>
                <select id="metric" name="metric" className="field" defaultValue="NET_PNL">
                  {GOAL_METRICS.map((metric) => (
                    <option key={metric.value} value={metric.value}>
                      {metric.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="period">
                  Period
                </label>
                <select id="period" name="period" className="field" defaultValue="MONTHLY">
                  {["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].map((period) => (
                    <option key={period} value={period}>
                      {period.charAt(0) + period.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="direction">
                  Condition
                </label>
                <select id="direction" name="direction" className="field" defaultValue="AT_LEAST">
                  <option value="AT_LEAST">At least</option>
                  <option value="AT_MOST">At most</option>
                </select>
              </div>

              <div>
                <label className="label" htmlFor="target">
                  Target
                </label>
                <input id="target" name="target" type="number" step="any" required className="field num" />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label" htmlFor="notes">
                  Notes <span className="text-ink-faint">(optional)</span>
                </label>
                <input id="notes" name="notes" className="field" placeholder="Why this matters" />
              </div>
            </div>

            {state?.error ? (
              <p className="mx-5 mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2 border-t border-line px-5 py-4">
              <button type="submit" disabled={pending} className="btn btn-primary">
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Target size={15} />}
                Create goal
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {progress.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[...active, ...inactive].map((item) => (
            <Card
              key={item.goal.id}
              className={cn("p-4", !item.goal.active && "opacity-55")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.goal.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">
                    {item.periodLabel} ·{" "}
                    {item.goal.direction === "AT_MOST" ? "at most" : "at least"}{" "}
                    {formatValue(item.target, item.unit)}
                  </p>
                </div>
                {item.goal.active ? (
                  item.met ? (
                    <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle size={17} className="shrink-0 text-rose-400" />
                  )
                ) : null}
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span
                  className={cn(
                    "num text-xl font-semibold",
                    item.met ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {formatValue(item.actual, item.unit)}
                </span>
                <span className="num text-xs text-ink-faint">
                  {item.progressPercent.toFixed(0)}%
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.met ? "bg-emerald-400" : "bg-rose-400",
                  )}
                  style={{ width: `${Math.max(2, item.progressPercent)}%` }}
                />
              </div>

              {item.goal.notes ? (
                <p className="mt-2.5 text-[11px] text-ink-faint">{item.goal.notes}</p>
              ) : null}

              <div className="mt-3 flex items-center justify-between border-t border-line-soft pt-2.5">
                <span className="text-[10px] text-ink-faint">
                  {item.sampleSize} {item.unit === "score" ? "scored trades" : "trades"} in period
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title={item.goal.active ? "Pause goal" : "Activate goal"}
                    onClick={() =>
                      startTransition(() => void toggleGoal(item.goal.id, !item.goal.active))
                    }
                    className="rounded p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Power size={13} />
                  </button>
                  <button
                    type="button"
                    title="Delete goal"
                    onClick={() => startTransition(() => void deleteGoal(item.goal.id))}
                    className="rounded p-1 text-ink-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Target size={22} />}
            title="No goals yet"
            description="Set guardrails like 'maximum 3 trades per day' or 'stop after -2R', plus targets for win rate, R and journal completion."
            action={
              <button type="button" onClick={() => setShowForm(true)} className="btn btn-primary">
                <Plus size={15} /> Create your first goal
              </button>
            }
          />
        </Card>
      )}
    </div>
  );
}
