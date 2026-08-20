"use client";

import { Card, CardHeader } from "@/components/ui/primitives";
import { BreakdownBarChart } from "@/components/charts/breakdown-chart";
import { formatCurrency, formatPercent, formatR, formatSignedCurrency } from "@/lib/format";
import type { Breakdown } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type Band = {
  key: string;
  label: string;
  trades: number;
  winRate: number;
  netPnl: number;
  avgR: number;
  expectancy: number;
  profitFactor: number;
};

export function PsychologyPanel({
  confidence,
  setupQuality,
  execution,
  discipline,
  planAdherence,
  emotions,
  currency = "USD",
}: {
  confidence: Band[];
  setupQuality: Band[];
  execution: Band[];
  discipline: Band[];
  planAdherence: Band[];
  emotions: Breakdown[];
  currency?: string;
}) {
  const groups = [
    { title: "Confidence before entry", bands: confidence },
    { title: "Setup quality", bands: setupQuality },
    { title: "Execution quality", bands: execution },
    { title: "Discipline score", bands: discipline },
  ];

  // Headline insight: contrast the high band against the low band on discipline.
  const high = discipline.find((b) => b.key === "8-10");
  const low = discipline.find((b) => b.key === "1-4");

  const followed = planAdherence.find((b) => b.key === "yes");
  const broke = planAdherence.find((b) => b.key === "no");

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold tracking-tight">Psychology analytics</h2>

      {high?.trades && low?.trades ? (
        <div className="card mb-4 border-accent/25 bg-accent/[0.04] p-4">
          <p className="text-sm leading-relaxed">
            Trades with a discipline score of <strong>8–10</strong> won{" "}
            <span className="num font-semibold text-up">{formatPercent(high.winRate)}</span> of
            the time at <span className="num font-semibold">{formatR(high.avgR)}</span> average, against{" "}
            <span className="num font-semibold text-down">{formatPercent(low.winRate)}</span> at{" "}
            <span className="num font-semibold">{formatR(low.avgR)}</span> when discipline dropped to{" "}
            <strong>1–4</strong>.
          </p>
          {followed?.trades && broke?.trades ? (
            <p className="mt-2 text-xs text-ink-muted">
              Following the plan produced {formatSignedCurrency(followed.netPnl, currency)} across{" "}
              {followed.trades} trades; breaking it produced{" "}
              {formatSignedCurrency(broke.netPnl, currency)} across {broke.trades}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.title} className="overflow-hidden">
            <CardHeader title={group.title} subtitle="Grouped into low, medium and high bands" />
            <BandTable bands={group.bands} currency={currency} />
          </Card>
        ))}

        <Card className="overflow-hidden">
          <CardHeader title="Plan adherence" subtitle="Did following the plan actually pay?" />
          <BandTable bands={planAdherence} currency={currency} />
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Net P&L by emotional state before entry" />
          <BreakdownBarChart rows={emotions} metric="netPnl" currency={currency} height={260} />
        </Card>
      </div>
    </section>
  );
}

function BandTable({ bands, currency }: { bands: Band[]; currency: string }) {
  const populated = bands.filter((band) => band.trades > 0);

  if (!populated.length) {
    return (
      <p className="px-5 py-8 text-center text-xs text-ink-faint">
        No scored trades in this period — add psychology ratings on the trade form.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-line">
            {["Band", "Trades", "Win rate", "Net P&L", "Avg R", "Expectancy"].map((header, index) => (
              <th
                key={header}
                className={cn("table-head px-3 py-2 first:pl-5 last:pr-5", index > 0 && "text-right")}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {populated.map((band) => (
            <tr key={band.key} className="border-b border-line-soft last:border-0">
              <td className="px-3 py-2.5 pl-5 text-xs font-medium">{band.label}</td>
              <td className="num px-3 py-2.5 text-right text-xs">{band.trades}</td>
              <td className="num px-3 py-2.5 text-right text-xs">{formatPercent(band.winRate)}</td>
              <td
                className={cn(
                  "num px-3 py-2.5 text-right text-xs font-semibold",
                  band.netPnl > 0 ? "text-up" : band.netPnl < 0 ? "text-down" : "text-ink-muted",
                )}
              >
                {formatSignedCurrency(band.netPnl, currency)}
              </td>
              <td
                className={cn(
                  "num px-3 py-2.5 text-right text-xs",
                  band.avgR > 0 ? "text-up" : band.avgR < 0 ? "text-down" : "text-ink-muted",
                )}
              >
                {formatR(band.avgR)}
              </td>
              <td className="num px-3 py-2.5 pr-5 text-right text-xs text-ink-muted">
                {formatCurrency(band.expectancy, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
