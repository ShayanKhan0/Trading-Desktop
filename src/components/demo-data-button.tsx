"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Loader2, Trash2 } from "lucide-react";
import { loadDemoData, removeDemoData } from "@/lib/actions/settings";

export function DemoDataButton({ hasDemo = false }: { hasDemo?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await loadDemoData();
            setMessage(`Loaded ${result.trades} demo trades`);
            router.refresh();
          })
        }
        className="btn btn-ghost"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Database size={15} />}
        Load demo data
      </button>

      {hasDemo ? (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await removeDemoData();
              setMessage("Demo data removed");
              router.refresh();
            })
          }
          className="btn btn-danger"
        >
          <Trash2 size={14} /> Clear demo data
        </button>
      ) : null}

      {message ? <span className="text-xs text-emerald-400">{message}</span> : null}
    </span>
  );
}
