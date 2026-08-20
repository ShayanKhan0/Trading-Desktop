"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LayoutGrid, Loader2 } from "lucide-react";
import { saveDashboardLayout } from "@/lib/actions/settings";
import { cn } from "@/lib/utils";

export const WIDGETS = [
  { id: "equity", label: "Equity curve" },
  { id: "calendar", label: "P&L calendar" },
  { id: "setups", label: "Setup performance" },
  { id: "instruments", label: "Instrument performance" },
  { id: "winrate", label: "Win rate by session" },
  { id: "weekday", label: "Day of week" },
  { id: "direction", label: "Long vs short" },
  { id: "recent", label: "Recent trades" },
];

export function DashboardWidgets({ hidden }: { hidden: string[] }) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string[]>(hidden);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) => {
    const next = local.includes(id) ? local.filter((w) => w !== id) : [...local, id];
    setLocal(next);
    startTransition(async () => {
      await saveDashboardLayout(next);
      router.refresh();
    });
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-ghost">
        {pending ? <Loader2 size={14} className="animate-spin" /> : <LayoutGrid size={14} />}
        Widgets
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="card animate-fade-up absolute right-0 z-30 mt-2 w-60 p-1.5 shadow-xl">
            <p className="px-2.5 py-1.5 text-[11px] text-ink-faint">Show or hide dashboard cards</p>
            {WIDGETS.map((widget) => {
              const visible = !local.includes(widget.id);
              return (
                <button
                  key={widget.id}
                  type="button"
                  onClick={() => toggle(widget.id)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {widget.label}
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      visible ? "border-accent bg-accent/20 text-accent" : "border-line",
                    )}
                  >
                    {visible ? <Check size={11} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
