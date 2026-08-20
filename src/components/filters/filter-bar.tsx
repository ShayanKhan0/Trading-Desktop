"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Loader2, RotateCcw, X } from "lucide-react";
import { RANGE_PRESETS } from "@/lib/date-range";
import type { Taxonomy } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { MARKETS } from "@/lib/constants";

type MultiKey =
  | "symbols"
  | "markets"
  | "directions"
  | "results"
  | "setups"
  | "strategies"
  | "sessions"
  | "tags"
  | "mistakes"
  | "confluences";

type Option = { value: string; label: string };

export function FilterBar({
  taxonomy,
  showAdvanced = true,
}: {
  taxonomy: Taxonomy;
  showAdvanced?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const range = params.get("range") ?? "month";
  const customFrom = params.get("from") ?? "";
  const customTo = params.get("to") ?? "";

  const groups: { key: MultiKey; label: string; options: Option[] }[] = useMemo(
    () => [
      {
        key: "symbols",
        label: "Instrument",
        options: (taxonomy.symbols.length
          ? taxonomy.symbols
          : taxonomy.instruments.map((i) => i.symbol)
        ).map((s) => ({ value: s, label: s })),
      },
      {
        key: "markets",
        label: "Market",
        options: MARKETS.map((m) => ({ value: m, label: title(m) })),
      },
      {
        key: "directions",
        label: "Direction",
        options: [
          { value: "LONG", label: "Long" },
          { value: "SHORT", label: "Short" },
        ],
      },
      {
        key: "results",
        label: "Result",
        options: [
          { value: "WIN", label: "Win" },
          { value: "LOSS", label: "Loss" },
          { value: "BREAKEVEN", label: "Breakeven" },
        ],
      },
      {
        key: "setups",
        label: "Setup",
        options: taxonomy.setups.map((s) => ({ value: s.id, label: s.name })),
      },
      {
        key: "strategies",
        label: "Strategy",
        options: taxonomy.strategies.map((s) => ({
          value: s.id,
          label: s.name,
        })),
      },
      {
        key: "sessions",
        label: "Session",
        options: taxonomy.sessions.map((s) => ({ value: s.id, label: s.name })),
      },
      {
        key: "tags",
        label: "Tag",
        options: taxonomy.tags.map((t) => ({ value: t.id, label: t.name })),
      },
      {
        key: "mistakes",
        label: "Mistake",
        options: taxonomy.mistakes.map((m) => ({ value: m.id, label: m.name })),
      },
      {
        key: "confluences",
        label: "Confluence",
        options: taxonomy.confluences.map((c) => ({
          value: c.id,
          label: c.name,
        })),
      },
    ],
    [taxonomy],
  );

  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page"); // any filter change resets pagination
    startTransition(() =>
      router.push(`${pathname}?${next.toString()}`, { scroll: false }),
    );
  };

  const selected = (key: MultiKey) =>
    (params.get(key) ?? "").split(",").filter(Boolean);

  const toggle = (key: MultiKey, value: string) => {
    const current = selected(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update((sp) =>
      next.length ? sp.set(key, next.join(",")) : sp.delete(key),
    );
  };

  const setScalar = (key: string, value: string) => {
    update((sp) => (value ? sp.set(key, value) : sp.delete(key)));
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    for (const group of groups) {
      for (const value of selected(group.key)) {
        const option = group.options.find((o) => o.value === value);
        chips.push({
          key: `${group.key}:${value}`,
          label: `${group.label}: ${option?.label ?? value}`,
          onRemove: () => toggle(group.key, value),
        });
      }
    }

    const followedPlan = params.get("followedPlan");
    if (followedPlan) {
      chips.push({
        key: "followedPlan",
        label: `Plan: ${followedPlan === "yes" ? "Followed" : "Broken"}`,
        onRemove: () => setScalar("followedPlan", ""),
      });
    }

    for (const [key, label] of [
      ["rMin", "R ≥"],
      ["rMax", "R ≤"],
      ["pnlMin", "P&L ≥"],
      ["pnlMax", "P&L ≤"],
    ] as const) {
      const value = params.get(key);
      if (value) {
        chips.push({
          key,
          label: `${label} ${value}`,
          onRemove: () => setScalar(key, ""),
        });
      }
    }

    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, groups]);

  const resetAll = () => {
    startTransition(() => router.push(pathname, { scroll: false }));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-surface p-1">
          {RANGE_PRESETS.filter((p) => p.value !== "custom").map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() =>
                update((sp) => {
                  sp.set("range", preset.value);
                  sp.delete("from");
                  sp.delete("to");
                })
              }
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                range === preset.value
                  ? "bg-accent/15 text-accent"
                  : "text-ink-faint hover:bg-surface-2 hover:text-ink",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            aria-label="Custom start date"
            onChange={(e) =>
              update((sp) => {
                sp.set("range", "custom");
                if (e.target.value) sp.set("from", e.target.value);
                else sp.delete("from");
              })
            }
            className="field w-[9.5rem] py-1.5 text-xs"
          />
          <span className="text-xs text-ink-faint">to</span>
          <input
            type="date"
            value={customTo}
            aria-label="Custom end date"
            onChange={(e) =>
              update((sp) => {
                sp.set("range", "custom");
                if (e.target.value) sp.set("to", e.target.value);
                else sp.delete("to");
              })
            }
            className="field w-[9.5rem] py-1.5 text-xs"
          />
        </div>

        {showAdvanced ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "btn btn-ghost py-1.5 text-xs",
              open && "border-accent/40 text-ink",
            )}
          >
            <Filter size={13} />
            Filters
            {activeChips.length ? (
              <span className="rounded-full bg-accent/20 px-1.5 text-[10px] font-semibold text-accent">
                {activeChips.length}
              </span>
            ) : null}
            <ChevronDown
              size={13}
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>
        ) : null}

        {activeChips.length || range !== "month" ? (
          <button
            type="button"
            onClick={resetAll}
            className="btn btn-ghost py-1.5 text-xs"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        ) : null}

        {pending ? (
          <Loader2 size={14} className="animate-spin text-ink-faint" />
        ) : null}
      </div>

      {activeChips.length ? (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="chip transition-colors hover:border-down/40 hover:text-down"
            >
              {chip.label}
              <X size={11} />
            </button>
          ))}
        </div>
      ) : null}

      {showAdvanced ? (
        <div className="collapsible" data-open={open}>
          <div>
            <div className="card space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups
                  .filter((group) => group.options.length > 0)
                  .map((group) => (
                    <div key={group.key}>
                      <p className="label">{group.label}</p>
                      <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pr-1">
                        {group.options.map((option) => {
                          const active = selected(group.key).includes(
                            option.value,
                          );
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggle(group.key, option.value)}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                                active
                                  ? "border-accent/40 bg-accent/12 text-accent"
                                  : "border-line bg-canvas text-ink-muted hover:text-ink",
                              )}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                <div>
                  <p className="label">Followed plan</p>
                  <div className="flex gap-1.5">
                    {[
                      { value: "yes", label: "Followed" },
                      { value: "no", label: "Broken" },
                    ].map((option) => {
                      const active =
                        params.get("followedPlan") === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            setScalar(
                              "followedPlan",
                              active ? "" : option.value,
                            )
                          }
                          className={cn(
                            "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                            active
                              ? "border-accent/40 bg-accent/12 text-accent"
                              : "border-line bg-canvas text-ink-muted hover:text-ink",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="label">R multiple range</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Min"
                      defaultValue={params.get("rMin") ?? ""}
                      onBlur={(e) => setScalar("rMin", e.target.value)}
                      className="field py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Max"
                      defaultValue={params.get("rMax") ?? ""}
                      onBlur={(e) => setScalar("rMax", e.target.value)}
                      className="field py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <p className="label">P&amp;L range</p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder="Min"
                      defaultValue={params.get("pnlMin") ?? ""}
                      onBlur={(e) => setScalar("pnlMin", e.target.value)}
                      className="field py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      defaultValue={params.get("pnlMax") ?? ""}
                      onBlur={(e) => setScalar("pnlMax", e.target.value)}
                      className="field py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const title = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();
