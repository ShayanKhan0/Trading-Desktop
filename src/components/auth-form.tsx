"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";
import { LineChart, Loader2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  return (
    <div className="w-full max-w-sm animate-fade-up">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <LineChart size={18} />
        </span>
        <span className="text-base font-semibold tracking-tight">TradeLedger</span>
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === "login" ? "Welcome back" : "Create your journal"}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {mode === "login"
          ? "Sign in to review your trades and performance."
          : "Start journaling every trade and find your real edge."}
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        <input type="hidden" name="next" value={next} />

        {mode === "signup" ? (
          <div>
            <label className="label" htmlFor="name">
              Name <span className="text-ink-faint">(optional)</span>
            </label>
            <input id="name" name="name" className="field" placeholder="Alex Morgan" autoComplete="name" />
          </div>
        ) : null}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="field"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            className="field"
            placeholder="At least 8 characters"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {state?.error ? (
          <p className="rounded-lg border border-down/25 bg-down-soft px-3 py-2 text-xs text-down">
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? <Loader2 size={16} className="animate-spin" /> : null}
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {mode === "login" ? (
          <>
            No account yet?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
