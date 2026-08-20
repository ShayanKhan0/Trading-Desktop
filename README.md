# TradeLedger

A production-grade trading journal and analytics platform. Log every trade with the context that
matters — setup, session, risk, psychology and mistakes — then let the analytics show which
conditions actually make money and which habits quietly drain the account.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma and PostgreSQL.

---

## Features

**Journaling**
- Full trade entry form with live P&L, risk, reward, planned R:R and R-multiple calculation
- Manual P&L override for trades the maths can't model
- Psychology scoring (confidence, setup quality, execution quality, discipline) on a 1–10 scale
- Confluence stacking: record every reason a setup was worth taking, then see which reasons carry the edge
- Mistake tagging, custom tags, emotions before/after, plan adherence
- Seven journal fields per trade: thesis, entry reason, exit reason, what went well/wrong, lesson, notes
- Multi-image screenshot attachments with drag-and-drop, phase labelling, gallery and lightbox
- Daily journal with structured end-of-day questions and a 1–10 day rating
- Weekly and monthly reviews with automatic performance summaries and period-over-period comparison

**Analytics**
- 40+ metrics: win rate, profit factor, expectancy, average/largest winner and loser, streaks,
  average holding time, drawdown, risk consistency and more
- Equity curve with four modes (cumulative P&L, account balance, cumulative R, daily P&L)
- P&L calendar with per-day P&L, trade count, win rate and weekly totals — click through to the day
- Drawdown analysis with currency/percentage toggle, duration and recovery period
- Distributions: R-multiple, winners, losers, overall P&L, trade duration
- Breakdowns by setup, strategy, instrument, session, tag, market condition, hour of entry, day of week
- Psychology analytics: performance banded by each 1–10 score, plus plan adherence and emotional state
- Confluence analysis: performance per confluence, plus win rate by how many confluences were stacked
- Mistake analysis: frequency, share of all trades, win rate and aggregate cost per mistake type

**Platform**
- Email/password authentication with database-backed sessions and per-user data isolation
- Global filter system (date range, instrument, market, setup, strategy, session, direction, result,
  tag, mistake, plan adherence, R range, P&L range, free-text search) applied across every view
- Goals with automatic progress evaluation against the live trade data
- CSV import with automatic column matching, validation, preview and duplicate detection
- CSV export of filtered trades, all trades, or an analytics summary
- One-click demo data: six months of realistic generated trades, flagged and removable
- Dark-first responsive design — sidebar on desktop, drawer plus bottom navigation on mobile

---

## Getting started

### Prerequisites
- Node.js 20+
- A PostgreSQL 14+ database (Neon, Supabase, Railway, or local)

### Setup

```bash
git clone <repository-url>
cd tradeledger
npm install

cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL and AUTH_SECRET (generate with: openssl rand -base64 32)

npx prisma migrate deploy   # create the schema
npm run dev                 # http://localhost:3000
```

Sign up, then click **Load demo data** on the dashboard (or Settings → Account) to populate the app
with six months of generated trades so every chart and report has something to show.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string used for runtime queries. On a serverless host use the **pooled** string. Managed providers usually need `?sslmode=require`. |
| `DIRECT_URL` | yes | **Direct** (unpooled) connection string, used only by `prisma migrate`. On a database with no pooler, set it to the same value as `DATABASE_URL`. |
| `AUTH_SECRET` | yes | Secret used to sign session JWTs. Generate with `openssl rand -base64 32`. |

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Serve the production build |
| `npm run db:migrate` | Apply migrations (`prisma migrate deploy`) |
| `npm run db:push` | Push the schema without a migration (development only) |
| `npm run db:studio` | Open Prisma Studio |
| `npx playwright test` | Run the end-to-end suite against a running server |

---

## Deployment

The app is a standard Next.js application and deploys cleanly to Vercel.

1. **Create a PostgreSQL database.** [Neon](https://neon.tech) and [Supabase](https://supabase.com)
   both have free tiers. Copy **both** connection strings — pooled and direct (see
   *Connection strings* below).
2. **Import the repository into Vercel** (New Project → import from Git).
3. **Set environment variables** in Vercel → Settings → Environment Variables:
   - `DATABASE_URL` — the pooled connection string
   - `DIRECT_URL` — the direct connection string
   - `AUTH_SECRET` — `openssl rand -base64 32`
4. **Deploy.** `vercel.json` sets the build command to
   `prisma generate && prisma migrate deploy && next build`, so migrations run automatically on
   every deployment and the schema is created on the first one.

Or from the CLI:

```bash
npm i -g vercel
vercel link
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
vercel --prod
```

### Connection strings — read this before the first deploy

The app needs **two** connection strings, because they do different jobs:

| Variable | Which string | Why |
| --- | --- | --- |
| `DATABASE_URL` | the **pooled** one (`-pooler` in the host) | Serverless functions open and drop connections constantly; the pooler keeps the database from running out. |
| `DIRECT_URL` | the **direct** one (no `-pooler`) | `prisma migrate deploy` takes a Postgres advisory lock, and a transaction-mode pooler cannot hold one across statements. |

Both are on the Neon project dashboard — the connection-string panel has a **Pooled connection**
toggle that switches between them. Append `?sslmode=require` to each.

If your database has **no** pooler (local Postgres, a plain VPS), set both variables to the same
direct string. That is what `.env` does for local development.

**Symptoms of getting this wrong**, all at build time, all fixed by pointing `DIRECT_URL` at the
direct string:

- `prepared statement "s0" already exists`
- `Timed out trying to acquire a postgres advisory lock`
- `Error: P1001` / the build hanging on *Applying migration*

### Post-deployment checklist
- [ ] Sign up creates an account and lands on the dashboard
- [ ] Load demo data populates the equity curve, calendar and analytics
- [ ] Creating a trade persists it and appears in the trades table
- [ ] Filters change the metrics on the dashboard and analytics pages
- [ ] CSV export downloads
- [ ] Signing out and back in restores the session

---

## Architecture

```
src/
├── app/
│   ├── (auth)/            Sign in and sign up
│   ├── (app)/             Authenticated shell — dashboard, trades, analytics,
│   │                      calendar, journal, goals, reviews, settings
│   ├── api/export/        CSV export endpoint
│   └── page.tsx           Landing page
├── components/            UI — charts, tables, forms, filters, app shell
└── lib/
    ├── auth.ts            Session creation, verification and guards
    ├── calc.ts            P&L, risk, R-multiple derivation
    ├── metrics.ts         The analytics engine (all aggregations live here)
    ├── queries.ts         Filter → Prisma query translation and serialization
    ├── goals.ts           Goal progress evaluation
    ├── seed.ts            Default taxonomy and demo data generation
    └── actions/           Server actions (auth, trades, journal, goals, settings, import)
```

**Design decisions worth knowing:**

- **All money is `Decimal` in the database** and converted to `number` at the serialization
  boundary (`serializeTrade`), so no floating-point drift is ever persisted.
- **Times are stored and displayed in UTC.** Session and hour-of-day analytics are only meaningful
  against a fixed reference, and traders work across timezones.
- **The metrics engine is pure.** `lib/metrics.ts` takes an array of trades and returns
  aggregations with no database or React dependency, which keeps it trivially testable and lets
  every page reuse the same calculations.
- **Filters live in the URL.** Every view reads the same `parseFilters` output, so filter state is
  shareable, bookmarkable and survives a refresh.
- **Screenshots are stored as downscaled data URLs** on the trade record. This keeps the app free
  of an object-store dependency; images are resized to a 1600px max edge in the browser before
  upload. Swap `TradeImage.url` for object-store keys if you outgrow this.
- **Demo data is flagged, not separated.** `isDemo` on every generated row means it can be removed
  cleanly without touching real trades, and demo trades are badged in the UI.

### Database schema

15 tables: `User`, `AuthSession`, `Trade`, `Instrument`, `Strategy`, `Setup`, `TradingSession`,
`Tag`, `TradeTag`, `MistakeType`, `TradeMistake`, `Confluence`, `TradeConfluence`, `TradeImage`,
`DailyJournal`, `PeriodReview`,
`Goal`.

Every user-owned table carries a `userId` foreign key with `onDelete: Cascade`, and queries are
always scoped by it. `Trade` is indexed on `(userId, tradeDate)`, `(userId, entryTime)`,
`(userId, symbol)`, `(userId, setupId)` and `(userId, isDemo)` to keep the analytics aggregations
fast as the table grows. See `prisma/schema.prisma` for the full definition.

---

## Testing

`e2e/smoke.spec.ts` covers the critical paths end to end against a real database: sign-up, demo
data generation, dashboard and analytics rendering, trade creation with calculation verification,
filtering, journal persistence, CSV export, route protection and sign-out.

```bash
npm run build && npm start          # in one shell
npx playwright test                 # in another
```

Set `E2E_BASE_URL` to run the suite against a deployed environment:

```bash
E2E_BASE_URL=https://your-app.vercel.app npx playwright test
```

The suite creates its own throwaway accounts, so it is safe to run against a live deployment.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Build fails on `prisma migrate deploy` | You are on a transaction-mode connection pooler. See *Connection strings* above. |
| `AUTH_SECRET is not set` | The variable is missing from the deployment environment. Add it and redeploy. |
| Signed out on every request | `AUTH_SECRET` changed between deploys, invalidating existing session tokens. Sign in again. |
| Charts render empty with trades present | The active date range excludes them — the filter bar defaults to *This month*. Switch to *All time*. |
| Screenshot upload rejected | Images are downscaled to a 1600px max edge and capped at 3MB each, 12 per trade. |
