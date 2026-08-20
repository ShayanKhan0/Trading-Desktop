"use client";

import { useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import type { TradeRecord } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatNumber,
  formatR,
  formatRatio,
  formatSignedCurrency,
  formatTime,
} from "@/lib/format";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { phaseLabel } from "@/components/screenshot-uploader";
import { deleteTradeImage } from "@/lib/actions/trades";
import { cn } from "@/lib/utils";

type Image = { id: string; url: string; caption: string | null; phase: string };

export function TradeDetail({
  trade,
  images,
  currency = "USD",
}: {
  trade: TradeRecord;
  images: Image[];
  currency?: string;
}) {
  const [lightbox, setLightbox] = useState<Image | null>(null);
  const [, startTransition] = useTransition();

  const holdMs = trade.exitTime
    ? new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()
    : null;

  const journalFields = [
    { label: "Pre-trade thesis", value: trade.thesis },
    { label: "Reason for entry", value: trade.reasonEntry },
    { label: "Reason for exit", value: trade.reasonExit },
    { label: "What went well", value: trade.whatWentWell },
    { label: "What went wrong", value: trade.whatWentWrong },
    { label: "Lesson learned", value: trade.lesson },
    { label: "Notes", value: trade.notes },
  ].filter((field) => field.value);

  const scores = [
    { label: "Confidence before", value: trade.confidenceBefore },
    { label: "Setup quality", value: trade.setupQuality },
    { label: "Execution quality", value: trade.executionQuality },
    { label: "Discipline", value: trade.disciplineScore },
  ].filter((score) => score.value !== null);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
      <div className="space-y-4">
        {/* Result summary */}
        <Card className="overflow-hidden">
          <div
            className={cn(
              "px-5 py-4",
              trade.netPnl > 0
                ? "bg-up-soft/60"
                : trade.netPnl < 0
                  ? "bg-down-soft/60"
                  : "bg-surface-2",
            )}
          >
            <p className="text-xs text-ink-faint">Net P&amp;L</p>
            <p
              className={cn(
                "num mt-1 text-3xl font-semibold tracking-tight",
                trade.netPnl > 0
                  ? "text-up"
                  : trade.netPnl < 0
                    ? "text-down"
                    : "text-ink-muted",
              )}
            >
              {formatSignedCurrency(trade.netPnl, currency)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={trade.result === "WIN" ? "up" : trade.result === "LOSS" ? "down" : "neutral"}>
                {trade.result === "BREAKEVEN" ? "Breakeven" : trade.result === "WIN" ? "Win" : "Loss"}
              </Badge>
              <Badge tone={trade.direction === "LONG" ? "accent" : "warn"}>
                {trade.direction === "LONG" ? "Long" : "Short"}
              </Badge>
              {trade.isDemo ? <Badge>Demo data</Badge> : null}
              <span className="num text-xs text-ink-muted">{formatR(trade.rMultiple)}</span>
              {trade.pnlPercent !== null ? (
                <span className="num text-xs text-ink-muted">{trade.pnlPercent.toFixed(2)}%</span>
              ) : null}
            </div>
          </div>

          <dl className="divide-y divide-line-soft">
            <Row label="Gross P&L" value={formatSignedCurrency(trade.grossPnl, currency)} />
            <Row label="Fees" value={formatCurrency(trade.fees, currency)} />
            <Row
              label="Risk amount"
              value={trade.riskAmount !== null ? formatCurrency(trade.riskAmount, currency) : "—"}
            />
            <Row
              label="Reward amount"
              value={trade.rewardAmount !== null ? formatCurrency(trade.rewardAmount, currency) : "—"}
            />
            <Row
              label="Planned R:R"
              value={trade.plannedRr !== null ? `${formatRatio(trade.plannedRr)} : 1` : "—"}
            />
            <Row label="R multiple" value={formatR(trade.rMultiple)} />
          </dl>
        </Card>

        {/* Execution */}
        <Card>
          <CardHeader title="Execution" />
          <dl className="divide-y divide-line-soft">
            <Row label="Date" value={formatDate(trade.tradeDate)} />
            <Row
              label="Entry"
              value={`${formatPrice(trade.entryPrice)} @ ${formatTime(trade.entryTime)}`}
            />
            <Row
              label="Exit"
              value={
                trade.exitPrice !== null && trade.exitTime
                  ? `${formatPrice(trade.exitPrice)} @ ${formatTime(trade.exitTime)}`
                  : "Open"
              }
            />
            <Row label="Stop loss" value={trade.stopLoss !== null ? formatPrice(trade.stopLoss) : "—"} />
            <Row label="Take profit" value={trade.takeProfit !== null ? formatPrice(trade.takeProfit) : "—"} />
            <Row label="Position size" value={formatNumber(trade.positionSize, trade.positionSize % 1 === 0 ? 0 : 2)} />
            <Row label="Holding time" value={holdMs !== null ? formatDuration(holdMs) : "—"} />
            <Row label="Market" value={trade.market.charAt(0) + trade.market.slice(1).toLowerCase()} />
            <Row label="Strategy" value={trade.strategyName ?? "—"} />
            <Row label="Setup" value={trade.setupName ?? "—"} />
            <Row label="Session" value={trade.sessionName ?? "—"} />
            <Row label="Market condition" value={trade.marketCondition ?? "—"} />
          </dl>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader title="Timeline" />
          <ol className="space-y-3 px-5 pb-5">
            {[
              { time: trade.entryTime, label: "Entered", detail: `${formatPrice(trade.entryPrice)} · ${formatNumber(trade.positionSize, 2)} units` },
              ...(trade.stopLoss !== null
                ? [{ time: null, label: "Stop placed", detail: formatPrice(trade.stopLoss) }]
                : []),
              ...(trade.takeProfit !== null
                ? [{ time: null, label: "Target set", detail: formatPrice(trade.takeProfit) }]
                : []),
              ...(trade.exitTime
                ? [
                    {
                      time: trade.exitTime,
                      label: "Exited",
                      detail: `${trade.exitPrice !== null ? formatPrice(trade.exitPrice) : "—"} · ${formatSignedCurrency(trade.netPnl, currency)}`,
                    },
                  ]
                : []),
            ].map((event, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-medium">{event.label}</span>
                    <span className="num text-[11px] text-ink-faint">
                      {event.time ? formatTime(event.time) : "—"}
                    </span>
                  </div>
                  <p className="num text-[11px] text-ink-faint">{event.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Psychology */}
        {scores.length || trade.emotionBefore || trade.followedPlan !== null ? (
          <Card>
            <CardHeader title="Psychology" />
            <div className="space-y-3 px-5 pb-5">
              {scores.map((score) => (
                <div key={score.label}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-ink-muted">{score.label}</span>
                    <span className="num font-semibold">{score.value}/10</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        (score.value ?? 0) >= 8
                          ? "bg-up"
                          : (score.value ?? 0) >= 5
                            ? "bg-accent"
                            : "bg-down",
                      )}
                      style={{ width: `${((score.value ?? 0) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                {trade.emotionBefore ? <Badge>Before: {trade.emotionBefore}</Badge> : null}
                {trade.emotionAfter ? <Badge>After: {trade.emotionAfter}</Badge> : null}
                {trade.followedPlan !== null ? (
                  <Badge tone={trade.followedPlan ? "up" : "down"}>
                    {trade.followedPlan ? "Followed plan" : "Broke plan"}
                  </Badge>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        {/* Mistakes & tags */}
        {trade.mistakes.length || trade.tags.length || trade.confluences.length ? (
          <Card>
            <CardHeader title="Confluences, mistakes &amp; tags" />
            <div className="space-y-3 px-5 pb-5">
              {trade.confluences.length ? (
                <div>
                  <p className="label">
                    Confluences
                    <span className="ml-2 font-normal text-ink-faint">
                      {trade.confluences.length} stacked
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.confluences.map((confluence) => (
                      <Badge key={confluence.id} tone="up">
                        {confluence.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {trade.mistakes.length ? (
                <div>
                  <p className="label">Mistakes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.mistakes.map((mistake) => (
                      <Badge key={mistake.id} tone="down">
                        {mistake.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {trade.tags.length ? (
                <div>
                  <p className="label">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.tags.map((tag) => (
                      <Badge key={tag.id} tone="accent">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* Journal */}
        {journalFields.length ? (
          <Card>
            <CardHeader title="Journal" />
            <div className="space-y-4 px-5 pb-5">
              {journalFields.map((field) => (
                <div key={field.label}>
                  <p className="label">{field.label}</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Screenshots */}
        <Card>
          <CardHeader
            title="Screenshots"
            subtitle={images.length ? `${images.length} attached` : "None attached yet"}
          />
          {images.length ? (
            <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
              {images.map((image) => (
                <div key={image.id} className="group relative overflow-hidden rounded-lg border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.caption ?? phaseLabel(image.phase)}
                    onClick={() => setLightbox(image)}
                    className="h-32 w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">{phaseLabel(image.phase)}</p>
                      {image.caption ? (
                        <p className="truncate text-[10px] text-ink-faint">{image.caption}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      title="Delete screenshot"
                      onClick={() => startTransition(() => void deleteTradeImage(image.id))}
                      className="shrink-0 rounded p-1 text-ink-faint transition-colors hover:bg-down-soft hover:text-down"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 pb-6 text-xs text-ink-faint">
              Attach charts when editing this trade to build a visual record of the setup.
            </p>
          )}
        </Card>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-5 top-5 rounded-lg p-2 text-ink-muted transition-colors hover:bg-white/10 hover:text-ink"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={lightbox.caption ?? "Trade screenshot"}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2.5">
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="num text-sm font-medium">{value}</dd>
    </div>
  );
}

const formatPrice = (value: number) => (Math.abs(value) < 10 ? value.toFixed(5) : value.toFixed(2));
