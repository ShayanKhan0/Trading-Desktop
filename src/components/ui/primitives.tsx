import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-xs text-ink-faint">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "up" | "down" | "accent" | "warn";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-surface-2 text-ink-muted",
    up: "border-up/25 bg-up-soft text-up",
    down: "border-down/25 bg-down-soft text-down",
    accent: "border-accent/30 bg-accent/10 text-accent",
    warn: "border-warn/25 bg-warn-soft text-warn",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-tight text-ink">{children}</h2>
      {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}
