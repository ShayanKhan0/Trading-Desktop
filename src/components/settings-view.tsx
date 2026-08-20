"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { createTaxonomyItem, deleteTaxonomyItem, updateAccount } from "@/lib/actions/settings";
import type { Taxonomy } from "@/lib/queries";
import { MARKETS } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/primitives";
import { CsvImport } from "@/components/csv-import";
import { DemoDataButton } from "@/components/demo-data-button";
import { ExportButton } from "@/components/export-button";
import { cn } from "@/lib/utils";

type Tab = "account" | "taxonomy" | "data";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "taxonomy", label: "Instruments & setups" },
  { id: "data", label: "Import & export" },
];

type ActionState = { error?: string; success?: string } | undefined;

export function SettingsView({
  account,
  taxonomy,
  demoLoaded,
}: {
  account: {
    name: string | null;
    email: string;
    startingBalance: number;
    currency: string;
    timezone: string;
  };
  taxonomy: Taxonomy;
  demoLoaded: boolean;
}) {
  const [tab, setTab] = useState<Tab>("account");
  const [accountState, accountAction, accountPending] = useActionState<ActionState, FormData>(
    updateAccount,
    undefined,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === item.id
                ? "bg-accent/15 text-accent"
                : "text-ink-faint hover:bg-surface-2 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "account" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader
              title="Account"
              subtitle="Used for currency formatting and account-balance charts"
              action={
                accountState?.success ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 size={13} /> Saved
                  </span>
                ) : null
              }
            />
            <form action={accountAction}>
              <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="name">
                    Display name
                  </label>
                  <input id="name" name="name" defaultValue={account.name ?? ""} className="field" />
                </div>
                <div className="sm:col-span-2">
                  <p className="label">Email</p>
                  <input value={account.email} disabled className="field opacity-60" />
                </div>
                <div>
                  <label className="label" htmlFor="startingBalance">
                    Starting balance
                  </label>
                  <input
                    id="startingBalance"
                    name="startingBalance"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={account.startingBalance}
                    className="field num"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="currency">
                    Currency
                  </label>
                  <select id="currency" name="currency" defaultValue={account.currency} className="field">
                    {["USD", "EUR", "GBP", "AUD", "CAD", "CHF", "JPY", "INR"].map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="timezone">
                    Timezone label
                  </label>
                  <input
                    id="timezone"
                    name="timezone"
                    defaultValue={account.timezone}
                    className="field"
                    placeholder="UTC"
                  />
                  <p className="mt-1 text-[11px] text-ink-faint">
                    Trade times are stored and displayed in UTC for consistent session analysis.
                  </p>
                </div>
              </div>

              {accountState?.error ? (
                <p className="mx-5 mb-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                  {accountState.error}
                </p>
              ) : null}

              <div className="border-t border-line px-5 py-4">
                <button type="submit" disabled={accountPending} className="btn btn-primary">
                  {accountPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Save settings
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader
              title="Demo data"
              subtitle="Six months of realistic generated trades, clearly flagged and removable"
            />
            <div className="px-5 pb-5">
              <p className="mb-3 text-xs leading-relaxed text-ink-muted">
                Demo trades are marked separately from your real trades in the database, so you can
                explore every chart and then remove them without touching your own records.
              </p>
              <DemoDataButton hasDemo={demoLoaded} />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "taxonomy" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaxonomySection
            entity="instrument"
            title="Instruments"
            subtitle="Tick size and value give futures contracts an accurate point multiplier"
            items={taxonomy.instruments.map((i) => ({
              id: i.id,
              label: i.symbol,
              detail: [i.name, i.market, i.tickSize ? `tick ${i.tickSize} / ${i.tickValue}` : null]
                .filter(Boolean)
                .join(" · "),
            }))}
            extraFields={
              <>
                <input name="description" placeholder="Full name" className="field" />
                <select name="market" className="field" defaultValue="FUTURES">
                  {MARKETS.map((market) => (
                    <option key={market} value={market}>
                      {market.charAt(0) + market.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <input name="tickSize" type="number" step="any" placeholder="Tick size" className="field num" />
                <input name="tickValue" type="number" step="any" placeholder="Tick value" className="field num" />
              </>
            }
            placeholder="NQ"
          />

          <TaxonomySection
            entity="strategy"
            title="Strategies"
            items={taxonomy.strategies.map((s) => ({
              id: s.id,
              label: s.name,
              detail: s.description ?? "",
            }))}
            extraFields={<input name="description" placeholder="Description" className="field" />}
            placeholder="ICT Model"
          />

          <TaxonomySection
            entity="setup"
            title="Setups"
            subtitle="The building blocks of setup performance analysis"
            items={taxonomy.setups.map((s) => ({
              id: s.id,
              label: s.name,
              detail:
                taxonomy.strategies.find((strategy) => strategy.id === s.strategyId)?.name ?? "",
            }))}
            extraFields={
              <select name="strategyId" className="field" defaultValue="">
                <option value="">No strategy</option>
                {taxonomy.strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            }
            placeholder="ICT Silver Bullet"
          />

          <TaxonomySection
            entity="session"
            title="Trading sessions"
            subtitle="Hours are UTC and drive the session breakdowns"
            items={taxonomy.sessions.map((s) => ({
              id: s.id,
              label: s.name,
              detail: `${String(s.startHour).padStart(2, "0")}:00 – ${String(s.endHour).padStart(2, "0")}:00 UTC`,
            }))}
            extraFields={
              <>
                <input name="startHour" type="number" min="0" max="23" placeholder="Start hour" className="field num" />
                <input name="endHour" type="number" min="0" max="23" placeholder="End hour" className="field num" />
              </>
            }
            placeholder="Tokyo"
          />

          <TaxonomySection
            entity="tag"
            title="Tags"
            items={taxonomy.tags.map((t) => ({ id: t.id, label: t.name, detail: "" }))}
            placeholder="A+ Setup"
          />

          <TaxonomySection
            entity="mistake"
            title="Mistake types"
            subtitle="Anything you want to hold yourself accountable for"
            items={taxonomy.mistakes.map((m) => ({ id: m.id, label: m.name, detail: "" }))}
            placeholder="Chased the entry"
          />
        </div>
      ) : null}

      {tab === "data" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Export" subtitle="Download your trades or an analytics summary as CSV" />
            <div className="px-5 pb-5">
              <ExportButton />
            </div>
          </Card>
          <CsvImport />
        </div>
      ) : null}
    </div>
  );
}

function TaxonomySection({
  entity,
  title,
  subtitle,
  items,
  extraFields,
  placeholder,
}: {
  entity: string;
  title: string;
  subtitle?: string;
  items: { id: string; label: string; detail: string }[];
  extraFields?: React.ReactNode;
  placeholder?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createTaxonomyItem,
    undefined,
  );
  const [, startTransition] = useTransition();

  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} />

      <form action={formAction} className="space-y-2 px-5 pb-4">
        <input type="hidden" name="entity" value={entity} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="name" required placeholder={placeholder} className="field" />
          {extraFields}
        </div>
        {state?.error ? <p className="text-xs text-rose-400">{state.error}</p> : null}
        <button type="submit" disabled={pending} className="btn btn-ghost w-full">
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </form>

      <div className="max-h-64 overflow-y-auto border-t border-line">
        {items.length ? (
          <ul className="divide-y divide-line-soft">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.label}</p>
                  {item.detail ? (
                    <p className="truncate text-[11px] text-ink-faint">{item.detail}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => startTransition(() => void deleteTaxonomyItem(entity as never, item.id))}
                  className="shrink-0 rounded p-1 text-ink-faint transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-6 text-center text-xs text-ink-faint">Nothing added yet</p>
        )}
      </div>
    </Card>
  );
}
