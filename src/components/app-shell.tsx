"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  ListOrdered,
  LogOut,
  Menu,
  PlusCircle,
  Settings,
  Target,
  X,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: ListOrdered },
  { href: "/trades/new", label: "Add trade", icon: PlusCircle },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reviews", label: "Reviews", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: ListOrdered },
  { href: "/trades/new", label: "Add", icon: PlusCircle },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/journal", label: "Journal", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  if (href === "/trades") return pathname === "/trades" || /^\/trades\/(?!new).+/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  user,
  children,
}: {
  user: { email: string; name: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navList = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-0.5 px-3">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            data-active={active}
            className={cn(
              "nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
              active
                ? "bg-accent-soft font-medium text-accent-ink"
                : "text-ink-muted hover:bg-canvas/70 hover:text-ink",
            )}
          >
            <item.icon size={17} strokeWidth={1.9} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-line px-3 py-3">
      <div className="flex items-center gap-3 rounded-lg px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
          {(user.name ?? user.email).slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium">{user.name ?? "Trader"}</p>
          <p className="truncate text-[11px] text-ink-faint">{user.email}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-down"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface-2 lg:flex">
        <Link href="/dashboard" className="flex h-16 items-center gap-2 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <LineChart size={18} />
          </span>
          <span className="text-base font-semibold tracking-tight">TradeLedger</span>
        </Link>
        {navList()}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="animate-fade-up absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-surface-2">
            <div className="flex h-16 items-center justify-between px-5">
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <LineChart size={18} />
                </span>
                <span className="text-base font-semibold tracking-tight">TradeLedger</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-1.5 text-ink-faint hover:bg-surface-2 hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            {navList(() => setDrawerOpen(false))}
            {footer}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            <Menu size={20} />
          </button>
          <span className="flex items-center gap-2">
            <LineChart size={17} className="text-accent" />
            <span className="text-sm font-semibold tracking-tight">TradeLedger</span>
          </span>
        </header>

        <main className="min-w-0 flex-1 pb-20 lg:pb-0">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface-2/95 backdrop-blur lg:hidden">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors",
                  active ? "text-accent" : "text-ink-faint",
                )}
              >
                <item.icon size={19} strokeWidth={1.9} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
