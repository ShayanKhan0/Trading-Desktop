"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from "lucide-react";
import { importTrades, validateImport, type ImportResult } from "@/lib/actions/import";
import { IMPORT_FIELDS } from "@/lib/import-fields";
import { Card, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

type Row = Record<string, string>;
type Preview = Awaited<ReturnType<typeof validateImport>>;

const AUTO_MATCH: Record<string, string[]> = {
  tradeDate: ["date", "trade date", "trade_date", "opened", "open date", "entry date"],
  symbol: ["symbol", "instrument", "ticker", "market", "pair", "contract"],
  direction: ["direction", "side", "type", "buy/sell", "position"],
  positionSize: ["size", "quantity", "qty", "position size", "volume", "lots", "contracts"],
  entryPrice: ["entry", "entry price", "open price", "price", "avg entry"],
  exitPrice: ["exit", "exit price", "close price", "avg exit"],
  entryTime: ["entry time", "open time", "time"],
  exitTime: ["exit time", "close time"],
  stopLoss: ["stop", "stop loss", "sl", "stop_loss"],
  takeProfit: ["target", "take profit", "tp", "take_profit"],
  fees: ["fees", "commission", "commissions", "cost"],
  netPnl: ["pnl", "p&l", "net pnl", "net p&l", "profit", "realized pnl", "net_pnl"],
  market: ["asset class", "market type", "category"],
  setup: ["setup", "pattern"],
  strategy: ["strategy", "system"],
  session: ["session"],
  notes: ["notes", "comment", "comments", "description"],
};

export function CsvImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    setParseError(null);
    setPreview(null);
    setResult(null);

    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        if (!parsed.data.length) {
          setParseError("That file contained no data rows");
          return;
        }
        const fields = (parsed.meta.fields ?? []).filter(Boolean);
        setHeaders(fields);
        setRows(parsed.data);

        // Best-effort automatic column matching by header name.
        const auto: Record<string, string> = {};
        for (const field of IMPORT_FIELDS) {
          const candidates = AUTO_MATCH[field.key] ?? [];
          const match = fields.find((header) =>
            candidates.includes(header.trim().toLowerCase()),
          );
          if (match) auto[field.key] = match;
        }
        setMapping(auto);
      },
      error: () => setParseError("Could not read that CSV file"),
    });
  };

  const runValidate = () => {
    startTransition(async () => {
      const outcome = await validateImport(rows.slice(0, 2000), mapping);
      setPreview(outcome);
    });
  };

  const runImport = () => {
    startTransition(async () => {
      const outcome = await importTrades(rows.slice(0, 2000), mapping, { skipDuplicates });
      setResult(outcome);
      setPreview(null);
    });
  };

  const requiredMissing = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="1. Upload a CSV"
          subtitle="Exports from most brokers and platforms work — you map the columns in the next step."
        />
        <div className="px-5 pb-5">
          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-10 text-center transition-colors hover:border-accent/50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <FileUp size={22} className="text-ink-faint" />
            <span className="text-sm font-medium">
              {rows.length ? `${rows.length} rows loaded` : "Drop a CSV here or click to browse"}
            </span>
            <span className="text-xs text-ink-faint">First row must contain column headers</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
          {parseError ? <p className="mt-3 text-xs text-down">{parseError}</p> : null}
        </div>
      </Card>

      {headers.length ? (
        <Card>
          <CardHeader
            title="2. Map the columns"
            subtitle="Required fields are marked — everything else is optional."
          />
          <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
            {IMPORT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="label">
                  {field.label}
                  {field.required ? <span className="ml-0.5 text-down">*</span> : null}
                  {field.hint ? <span className="ml-1 text-ink-faint">({field.hint})</span> : null}
                </label>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((current) => {
                      const next = { ...current };
                      if (e.target.value) next[field.key] = e.target.value;
                      else delete next[field.key];
                      return next;
                    })
                  }
                  className={cn(
                    "field",
                    field.required && !mapping[field.key] && "border-down/40",
                  )}
                >
                  <option value="">— not mapped —</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
            <button
              type="button"
              onClick={runValidate}
              disabled={pending || requiredMissing.length > 0}
              className="btn btn-primary"
            >
              {pending ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Validate &amp; preview
            </button>
            {requiredMissing.length ? (
              <p className="text-xs text-warn">
                Map {requiredMissing.map((f) => f.label).join(", ")} to continue
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {preview ? (
        <Card>
          <CardHeader
            title="3. Review before importing"
            subtitle={`${preview.preview.length} valid rows · ${preview.preview.filter((r) => r.duplicate).length} possible duplicates · ${preview.errors.length} errors`}
          />

          {preview.errors.length ? (
            <div className="mx-5 mb-4 rounded-lg border border-down/25 bg-down-soft p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-down">
                <AlertTriangle size={13} /> Rows that will be skipped
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-down/90">
                {preview.errors.slice(0, 30).map((error) => (
                  <li key={error.row}>
                    Row {error.row}: {error.message}
                  </li>
                ))}
                {preview.errors.length > 30 ? (
                  <li>…and {preview.errors.length - 30} more</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <div className="max-h-72 overflow-auto border-y border-line">
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  {["Row", "Date", "Instrument", "Direction", "Net P&L", "Status"].map((header) => (
                    <th key={header} className="table-head px-3 py-2 text-left first:pl-5">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.preview.slice(0, 200).map((row) => (
                  <tr key={row.row} className="border-b border-line-soft last:border-0">
                    <td className="num px-3 py-1.5 pl-5 text-xs text-ink-faint">{row.row}</td>
                    <td className="num px-3 py-1.5 text-xs">{row.tradeDate}</td>
                    <td className="px-3 py-1.5 text-xs font-medium">{row.symbol}</td>
                    <td className="px-3 py-1.5 text-xs">{row.direction}</td>
                    <td className="num px-3 py-1.5 text-xs">
                      {row.netPnl !== null ? row.netPnl.toFixed(2) : "calculated"}
                    </td>
                    <td className="px-3 py-1.5 text-xs">
                      {row.duplicate ? (
                        <span className="text-warn">Possible duplicate</span>
                      ) : (
                        <span className="text-up">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--color-accent)]"
              />
              Skip possible duplicates
            </label>
            <button type="button" onClick={runImport} disabled={pending} className="btn btn-primary">
              {pending ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              Import {preview.preview.length} trades
            </button>
          </div>
        </Card>
      ) : null}

      {result ? (
        <Card>
          <div className="flex items-start gap-3 p-5">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-up" />
            <div>
              <p className="text-sm font-medium">Import complete</p>
              <p className="mt-1 text-xs text-ink-muted">
                {result.imported} trades imported · {result.duplicates} duplicates detected ·{" "}
                {result.skipped} rows skipped
              </p>
              {result.errors.length ? (
                <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-[11px] text-down/90">
                  {result.errors.slice(0, 20).map((error) => (
                    <li key={error.row}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
