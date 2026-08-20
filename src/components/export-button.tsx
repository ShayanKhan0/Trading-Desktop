"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";

export function ExportButton() {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const href = (type: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("type", type);
    return `/api/export?${next.toString()}`;
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn btn-ghost">
        <Download size={14} /> Export
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="card animate-fade-up absolute right-0 z-30 mt-2 w-56 p-1.5 shadow-xl">
            <a
              href={href("trades")}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Filtered trades (CSV)
              <span className="block text-[10px] text-ink-faint">
                Respects every active filter
              </span>
            </a>
            <a
              href="/api/export?type=trades&range=all"
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              All trades (CSV)
            </a>
            <a
              href={href("summary")}
              onClick={() => setOpen(false)}
              className="block rounded-md px-2.5 py-2 text-xs text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              Analytics summary (CSV)
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
