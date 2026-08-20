import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Filter,
  LineChart,
  ListChecks,
  ShieldAlert,
  Target,
  Upload,
} from "lucide-react";
import { LandingPreview } from "@/components/landing-preview";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Analytics that go deep",
    body: "Equity curve, drawdown, expectancy, profit factor, R-multiple distribution and 40+ other metrics — recalculated the moment you change a filter.",
  },
  {
    icon: Brain,
    title: "Psychology tracking",
    body: "Score confidence, setup quality, execution and discipline on every trade, then see exactly how your mental state maps onto your results.",
  },
  {
    icon: ShieldAlert,
    title: "Mistake accounting",
    body: "Tag revenge trades, moved stops and FOMO entries. Find out what each habit actually costs you in currency and in R.",
  },
  {
    icon: CalendarDays,
    title: "P&L calendar",
    body: "A month at a glance — daily P&L, trade counts and win/loss shading. Click any day to pull up the trades behind the number.",
  },
  {
    icon: Filter,
    title: "Global filtering",
    body: "Slice every chart and statistic by instrument, setup, session, direction, tag, plan adherence, R range or P&L range.",
  },
  {
    icon: ListChecks,
    title: "Structured reviews",
    body: "Daily journals plus weekly and monthly reviews with automatic performance summaries alongside your written reflection.",
  },
  {
    icon: Target,
    title: "Goals & guardrails",
    body: "Set max trades per day, daily loss limits, discipline floors and journal-completion targets — then track adherence.",
  },
  {
    icon: Upload,
    title: "Import & export",
    body: "Bring history in through CSV with column mapping, validation and duplicate detection. Export trades or summaries anytime.",
  },
];

const METRICS = [
  { label: "Net P&L", value: "+$18,420" },
  { label: "Win rate", value: "57.4%" },
  { label: "Profit factor", value: "1.94" },
  { label: "Avg R", value: "+0.42R" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <LineChart size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight">TradeLedger</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#preview" className="transition-colors hover:text-ink">
              Preview
            </a>
            <a href="#workflow" className="transition-colors hover:text-ink">
              Workflow
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost">
              Sign in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(154,101,55,0.10), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="chip mx-auto">
                <span className="h-1.5 w-1.5 rounded-full bg-up" />
                Built for traders who review their work
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
                Your trading journal,
                <br />
                <span className="text-accent">with the analytics to match.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted md:text-lg">
                Log every trade with the context that matters — setup, session, risk, emotion and
                mistakes — then let TradeLedger show you which conditions actually make you money and
                which habits quietly drain the account.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn btn-primary px-6 py-2.5">
                  Start journaling free
                  <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="btn btn-ghost px-6 py-2.5">
                  Sign in to your journal
                </Link>
              </div>

              <p className="mt-4 text-xs text-ink-faint">
                Load six months of demo data in one click to explore every chart.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
              {METRICS.map((metric) => (
                <div key={metric.label} className="card px-4 py-3 text-center">
                  <p className="text-xs text-ink-faint">{metric.label}</p>
                  <p className="num mt-1 text-lg font-semibold text-up">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview */}
        <section id="preview" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                A dashboard that answers real questions
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Not just &ldquo;how much did I make&rdquo; — but which setup carries the edge, what
                a broken plan costs, and where the drawdowns come from.
              </p>
            </div>
            <LandingPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Everything a serious review needs
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Built around the loop that actually improves results: journal the trade, review the
                day, review the week, adjust the plan.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card card-hover p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <feature.icon size={17} />
                  </span>
                  <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink-muted">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-line">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  The daily loop
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Five minutes after the close is worth more than five hours of screen time. The app
                  is shaped around that habit.
                </p>
              </div>

              <ol className="space-y-5">
                {[
                  {
                    step: "01",
                    title: "Log the trade while it's fresh",
                    body: "Prices, size and stop go in; P&L, risk, R-multiple and planned R:R are calculated for you. Add the thesis, the emotion and the mistake before you forget it.",
                  },
                  {
                    step: "02",
                    title: "Close the day with a review",
                    body: "Answer the same handful of questions each evening. The day's P&L, win rate, average R and best and worst trades are summarised automatically alongside your notes.",
                  },
                  {
                    step: "03",
                    title: "Find the pattern on the weekend",
                    body: "Compare setups side by side, check whether discipline scores predict outcomes, and see which mistake costs the most. Then change one thing.",
                  },
                ].map((item) => (
                  <li key={item.step} className="card flex gap-4 p-5">
                    <span className="num text-xs font-semibold text-accent">{item.step}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Start the journal you&apos;ll actually keep
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-ink-muted">
              Free to use, private by default, and yours to export at any time.
            </p>
            <Link href="/signup" className="btn btn-primary mt-8 px-7 py-2.5">
              Create your account
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-ink-faint sm:flex-row">
          <div className="flex items-center gap-2">
            <LineChart size={14} className="text-accent" />
            <span>TradeLedger — trading journal &amp; analytics</span>
          </div>
          <p>Track your process. The results follow.</p>
        </div>
      </footer>
    </div>
  );
}
