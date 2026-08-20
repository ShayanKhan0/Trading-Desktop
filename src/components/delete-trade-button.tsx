"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTrade } from "@/lib/actions/trades";

export function DeleteTradeButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="btn btn-danger">
        <Trash2 size={14} /> Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void deleteTrade(id))}
        className="btn btn-danger"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        Confirm delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="btn btn-ghost">
        Cancel
      </button>
    </span>
  );
}
