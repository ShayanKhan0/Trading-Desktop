"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Trash2 } from "lucide-react";
import { createTrade, updateTrade, type TradeFormState } from "@/lib/actions/trades";
import { calculateTrade } from "@/lib/calc";
import { EMOTIONS, MARKETS, MARKET_CONDITIONS } from "@/lib/constants";
import { formatCurrency, formatR, formatRatio, formatSignedCurrency } from "@/lib/format";
import type { Taxonomy } from "@/lib/queries";
import type { TradeRecord } from "@/lib/types";
import { Card, CardHeader } from "@/components/ui/primitives";
import { ScreenshotUploader, type PendingImage } from "@/components/screenshot-uploader";
import { cn } from "@/lib/utils";

type Props = {
  taxonomy: Taxonomy;
  trade?: TradeRecord;
  currency?: string;
};

export function TradeForm({ taxonomy, trade, currency = "USD" }: Props) {
  const isEdit = Boolean(trade);
  const action = isEdit ? updateTrade : createTrade;
  const [state, formAction, pending] = useActionState<TradeFormState, FormData>(action, undefined);

  // Live preview state — mirrors the numeric inputs so the maths updates as you type.
  const [direction, setDirection] = useState(trade?.direction ?? "LONG");
  const [symbol, setSymbol] = useState(trade?.symbol ?? "");
  const [market, setMarket] = useState(trade?.market ?? "FUTURES");
  const [positionSize, setPositionSize] = useState(trade ? String(trade.positionSize) : "");
  const [entryPrice, setEntryPrice] = useState(trade ? String(trade.entryPrice) : "");
  const [exitPrice, setExitPrice] = useState(trade?.exitPrice != null ? String(trade.exitPrice) : "");
  const [stopLoss, setStopLoss] = useState(trade?.stopLoss != null ? String(trade.stopLoss) : "");
  const [takeProfit, setTakeProfit] = useState(trade?.takeProfit != null ? String(trade.takeProfit) : "");
  const [fees, setFees] = useState(trade ? String(trade.fees) : "");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualNetPnl, setManualNetPnl] = useState(trade ? String(trade.netPnl) : "");

  const [tagIds, setTagIds] = useState<string[]>(trade?.tags.map((t) => t.id) ?? []);
  const [mistakeIds, setMistakeIds] = useState<string[]>(trade?.mistakes.map((m) => m.id) ?? []);
  const [confluenceIds, setConfluenceIds] = useState<string[]>(
    trade?.confluences.map((c) => c.id) ?? [],
  );
  const [images, setImages] = useState<PendingImage[]>([]);

  const instrument = useMemo(
    () => taxonomy.instruments.find((i) => i.symbol === symbol.toUpperCase()),
    [taxonomy.instruments, symbol],
  );

  const pointValue =
    instrument?.tickSize && instrument?.tickValue && instrument.tickSize !== 0
      ? instrument.tickValue / instrument.tickSize
      : null;

  const preview = useMemo(
    () =>
      calculateTrade({
        direction,
        positionSize: Number(positionSize) || 0,
        entryPrice: Number(entryPrice) || 0,
        exitPrice: exitPrice === "" ? null : Number(exitPrice),
        stopLoss: stopLoss === "" ? null : Number(stopLoss),
        takeProfit: takeProfit === "" ? null : Number(takeProfit),
        fees: fees === "" ? 0 : Number(fees),
        pointValue,
      }),
    [direction, positionSize, entryPrice, exitPrice, stopLoss, takeProfit, fees, pointValue],
  );

  const effectiveNet = manualOverride && manualNetPnl !== "" ? Number(manualNetPnl) : preview.netPnl;
  const effectiveR =
    preview.riskAmount && preview.riskAmount > 0 ? effectiveNet / preview.riskAmount : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit ? <input type="hidden" name="id" value={trade!.id} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      {tagIds.map((id) => (
        <input key={id} type="hidden" name="tagIds" value={id} />
      ))}
      {mistakeIds.map((id) => (
        <input key={id} type="hidden" name="mistakeIds" value={id} />
      ))}
      {confluenceIds.map((id) => (
        <input key={id} type="hidden" name="confluenceIds" value={id} />
      ))}
      {manualOverride && manualNetPnl !== "" ? (
        <input type="hidden" name="manualNetPnl" value={manualNetPnl} />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-4">
          {/* Basics */}
          <Card>
            <CardHeader title="Trade details" subtitle="Times are recorded in UTC" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Trade date" required>
                <input
                  type="date"
                  name="tradeDate"
                  required
                  defaultValue={trade?.tradeDate ?? today}
                  className="field"
                />
              </Field>

              <Field label="Entry time">
                <input
                  type="time"
                  name="entryTime"
                  defaultValue={trade ? trade.entryTime.slice(11, 16) : ""}
                  className="field"
                />
              </Field>

              <Field label="Exit time">
                <input
                  type="time"
                  name="exitTime"
                  defaultValue={trade?.exitTime ? trade.exitTime.slice(11, 16) : ""}
                  className="field"
                />
              </Field>

              <Field label="Instrument" required>
                <input
                  name="symbol"
                  required
                  list="instrument-options"
                  value={symbol}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setSymbol(value);
                    const match = taxonomy.instruments.find((i) => i.symbol === value);
                    if (match) setMarket(match.market);
                  }}
                  placeholder="NQ, EURUSD, XAUUSD…"
                  className="field uppercase"
                />
                <datalist id="instrument-options">
                  {taxonomy.instruments.map((i) => (
                    <option key={i.id} value={i.symbol}>
                      {i.name ?? i.symbol}
                    </option>
                  ))}
                </datalist>
                <input type="hidden" name="instrumentId" value={instrument?.id ?? ""} />
              </Field>

              <Field label="Market">
                <select
                  name="market"
                  value={market}
                  onChange={(e) => setMarket(e.target.value)}
                  className="field"
                >
                  {MARKETS.map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0) + value.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Direction" required>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["LONG", "SHORT"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDirection(value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        direction === value
                          ? value === "LONG"
                            ? "border-up/40 bg-up-soft text-up"
                            : "border-down/40 bg-down-soft text-down"
                          : "border-line bg-canvas text-ink-muted hover:text-ink",
                      )}
                    >
                      {value === "LONG" ? "Long" : "Short"}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="direction" value={direction} />
              </Field>
            </div>
          </Card>

          {/* Prices */}
          <Card>
            <CardHeader
              title="Prices &amp; size"
              subtitle={
                pointValue
                  ? `${symbol.toUpperCase()} point value ${formatCurrency(pointValue, currency)} per unit`
                  : "P&L is derived from price × size (add tick data in Settings for contract multipliers)"
              }
            />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Position size" required>
                <input
                  name="positionSize"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={positionSize}
                  onChange={(e) => setPositionSize(e.target.value)}
                  className="field num"
                  placeholder="2"
                />
              </Field>
              <Field label="Entry price" required>
                <input
                  name="entryPrice"
                  type="number"
                  step="any"
                  required
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="field num"
                />
              </Field>
              <Field label="Exit price">
                <input
                  name="exitPrice"
                  type="number"
                  step="any"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="field num"
                  placeholder="Leave blank if still open"
                />
              </Field>
              <Field label="Stop loss">
                <input
                  name="stopLoss"
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="field num"
                />
              </Field>
              <Field label="Take profit">
                <input
                  name="takeProfit"
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="field num"
                />
              </Field>
              <Field label="Fees / commission">
                <input
                  name="fees"
                  type="number"
                  step="any"
                  value={fees}
                  onChange={(e) => setFees(e.target.value)}
                  className="field num"
                  placeholder="0.00"
                />
              </Field>
            </div>
          </Card>

          {/* Classification */}
          <Card>
            <CardHeader title="Classification" subtitle="Powers the setup and session analytics" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <Field label="Strategy">
                <select name="strategyId" defaultValue={trade?.strategyId ?? ""} className="field">
                  <option value="">—</option>
                  {taxonomy.strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Setup">
                <select name="setupId" defaultValue={trade?.setupId ?? ""} className="field">
                  <option value="">—</option>
                  {taxonomy.setups.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Trading session">
                <select name="sessionId" defaultValue={trade?.sessionId ?? ""} className="field">
                  <option value="">—</option>
                  {taxonomy.sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Market condition">
                <select
                  name="marketCondition"
                  defaultValue={trade?.marketCondition ?? ""}
                  className="field"
                >
                  <option value="">—</option>
                  {MARKET_CONDITIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <p className="label">
                  Confluences
                  <span className="ml-2 font-normal text-ink-faint">
                    Why this setup was worth taking &mdash; stack every reason that applied
                  </span>
                </p>
                <ChipPicker
                  options={taxonomy.confluences.map((c) => ({ id: c.id, label: c.name }))}
                  selected={confluenceIds}
                  onToggle={(id) =>
                    setConfluenceIds((current) =>
                      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
                    )
                  }
                  tone="up"
                  emptyHint="Create confluences in Settings"
                />
              </div>

              <div className="sm:col-span-2">
                <p className="label">Tags</p>
                <ChipPicker
                  options={taxonomy.tags.map((t) => ({ id: t.id, label: t.name }))}
                  selected={tagIds}
                  onToggle={(id) =>
                    setTagIds((current) =>
                      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
                    )
                  }
                  emptyHint="Create tags in Settings"
                />
              </div>
            </div>
          </Card>

          {/* Psychology */}
          <Card>
            <CardHeader
              title="Psychology"
              subtitle="Scored 1–10 — this drives the psychology analytics"
            />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <ScoreSlider
                name="confidenceBefore"
                label="Confidence before"
                defaultValue={trade?.confidenceBefore ?? null}
              />
              <ScoreSlider
                name="setupQuality"
                label="Setup quality"
                defaultValue={trade?.setupQuality ?? null}
              />
              <ScoreSlider
                name="executionQuality"
                label="Execution quality"
                defaultValue={trade?.executionQuality ?? null}
              />
              <ScoreSlider
                name="disciplineScore"
                label="Discipline"
                defaultValue={trade?.disciplineScore ?? null}
              />

              <Field label="Emotion before">
                <select name="emotionBefore" defaultValue={trade?.emotionBefore ?? ""} className="field">
                  <option value="">—</option>
                  {EMOTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Emotion after">
                <select name="emotionAfter" defaultValue={trade?.emotionAfter ?? ""} className="field">
                  <option value="">—</option>
                  {EMOTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Followed the trading plan?">
                <select
                  name="followedPlan"
                  defaultValue={
                    trade?.followedPlan === true ? "yes" : trade?.followedPlan === false ? "no" : ""
                  }
                  className="field"
                >
                  <option value="">—</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </Field>

              <div className="sm:col-span-2">
                <p className="label">Mistakes made</p>
                <ChipPicker
                  options={taxonomy.mistakes.map((m) => ({ id: m.id, label: m.name }))}
                  selected={mistakeIds}
                  onToggle={(id) =>
                    setMistakeIds((current) =>
                      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
                    )
                  }
                  tone="down"
                  emptyHint="Create mistake types in Settings"
                />
              </div>
            </div>
          </Card>

          {/* Journal */}
          <Card>
            <CardHeader title="Journal" subtitle="Write it while the trade is still fresh" />
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
              <TextArea name="thesis" label="Pre-trade thesis" defaultValue={trade?.thesis} rows={3} />
              <TextArea name="reasonEntry" label="Reason for entry" defaultValue={trade?.reasonEntry} rows={3} />
              <TextArea name="reasonExit" label="Reason for exit" defaultValue={trade?.reasonExit} rows={3} />
              <TextArea name="whatWentWell" label="What went well" defaultValue={trade?.whatWentWell} rows={3} />
              <TextArea name="whatWentWrong" label="What went wrong" defaultValue={trade?.whatWentWrong} rows={3} />
              <TextArea name="lesson" label="Lesson learned" defaultValue={trade?.lesson} rows={3} />
              <div className="sm:col-span-2">
                <TextArea name="notes" label="General notes" defaultValue={trade?.notes} rows={3} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Screenshots"
              subtitle="Drag and drop chart images — before entry, at entry, after exit, higher timeframe"
            />
            <div className="px-5 pb-5">
              <ScreenshotUploader images={images} onChange={setImages} />
            </div>
          </Card>
        </div>

        {/* Live calculation sidebar */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card>
            <CardHeader title="Calculated" subtitle="Updates as you type" />
            <dl className="space-y-2 px-5 pb-4">
              <Row label="Gross P&L" value={formatSignedCurrency(preview.grossPnl, currency)} tone={preview.grossPnl} />
              <Row label="Fees" value={formatCurrency(preview.fees, currency)} />
              <Row
                label="Net P&L"
                value={formatSignedCurrency(effectiveNet, currency)}
                tone={effectiveNet}
                strong
              />
              <div className="!my-3 border-t border-line-soft" />
              <Row
                label="Risk amount"
                value={preview.riskAmount !== null ? formatCurrency(preview.riskAmount, currency) : "—"}
              />
              <Row
                label="Reward amount"
                value={preview.rewardAmount !== null ? formatCurrency(preview.rewardAmount, currency) : "—"}
              />
              <Row
                label="Planned R:R"
                value={preview.plannedRr !== null ? `${formatRatio(preview.plannedRr)} : 1` : "—"}
              />
              <Row label="R multiple" value={formatR(effectiveR)} tone={effectiveR ?? 0} strong />
              <Row
                label="P&L %"
                value={preview.pnlPercent !== null ? `${preview.pnlPercent.toFixed(2)}%` : "—"}
              />
              <Row
                label="Result"
                value={
                  effectiveNet > 0 ? "Win" : effectiveNet < 0 ? "Loss" : "Breakeven"
                }
                tone={effectiveNet}
              />
            </dl>

            <div className="border-t border-line px-5 py-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={(e) => setManualOverride(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                />
                Override net P&amp;L manually
              </label>
              {manualOverride ? (
                <input
                  type="number"
                  step="any"
                  value={manualNetPnl}
                  onChange={(e) => setManualNetPnl(e.target.value)}
                  placeholder="Actual net P&L"
                  className="field num mt-2"
                />
              ) : null}
            </div>

            {state?.error ? (
              <p className="mx-5 mb-4 rounded-lg border border-down/25 bg-down-soft px-3 py-2 text-xs text-down">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-2 border-t border-line px-5 py-4">
              <button type="submit" disabled={pending} className="btn btn-primary flex-1">
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isEdit ? "Save changes" : "Save trade"}
              </button>
              <Link href={isEdit ? `/trades/${trade!.id}` : "/trades"} className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="label">
        {label}
        {required ? <span className="ml-0.5 text-down">*</span> : null}
      </p>
      {children}
    </div>
  );
}

function TextArea({
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

function ScoreSlider({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
}) {
  const [value, setValue] = useState<number | "">(defaultValue ?? "");

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        <span className="num text-xs font-semibold text-accent">{value === "" ? "—" : `${value}/10`}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value === "" ? 5 : value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
      <input type="hidden" name={name} value={value === "" ? "" : String(value)} />
      {value !== "" ? (
        <button
          type="button"
          onClick={() => setValue("")}
          className="mt-1 text-[10px] text-ink-faint hover:text-ink"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function ChipPicker({
  options,
  selected,
  onToggle,
  tone = "accent",
  emptyHint,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  tone?: "accent" | "down" | "up";
  emptyHint?: string;
}) {
  if (!options.length) {
    return <p className="text-xs text-ink-faint">{emptyHint}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              active
                ? tone === "down"
                  ? "border-down/40 bg-down/10 text-down"
                  : tone === "up"
                    ? "border-up/40 bg-up/10 text-up"
                    : "border-accent/45 bg-accent/12 text-accent-ink"
                : "border-line bg-canvas text-ink-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  tone?: number;
  strong?: boolean;
}) {
  const toneClass =
    tone === undefined
      ? "text-ink"
      : tone > 0
        ? "text-up"
        : tone < 0
          ? "text-down"
          : "text-ink-muted";

  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className={cn("num text-sm", strong ? "font-semibold" : "font-medium", toneClass)}>
        {value}
      </dd>
    </div>
  );
}
