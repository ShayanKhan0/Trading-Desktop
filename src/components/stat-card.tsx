import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  size = "md",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "neutral" | "up" | "down" | "auto";
  size?: "sm" | "md" | "lg";
}) {
  const toneClass =
    tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-ink";

  return (
    <div className="card card-hover px-4 py-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p
        className={cn(
          "num mt-1 font-semibold tracking-tight",
          size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
          toneClass,
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-ink-faint">{hint}</p> : null}
    </div>
  );
}

export function toneOf(value: number): "up" | "down" | "neutral" {
  return value > 0 ? "up" : value < 0 ? "down" : "neutral";
}
