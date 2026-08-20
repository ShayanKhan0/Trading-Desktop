import { test, expect } from "@playwright/test";

const email = `trader+${Date.now()}@example.com`;
const password = "correct-horse-battery";

test.describe.configure({ mode: "serial" });

test("sign up creates an isolated account and lands on the dashboard", async ({ page }) => {
  await page.goto("/signup");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.fill("#name", "Test Trader");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("demo data loads and populates the dashboard", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: /Load demo data/i }).click();

  // The button unmounts once the dashboard re-renders with data, so wait on the
  // dashboard itself rather than the transient confirmation message.
  await expect(page.getByText("Equity curve")).toBeVisible({ timeout: 180_000 });

  await page.goto("/dashboard?range=all");
  await expect(page.getByText("Net P&L").first()).toBeVisible();
  await expect(page.getByText("Equity curve")).toBeVisible();
  await expect(page.getByText("P&L calendar")).toBeVisible();
});

test("analytics renders every section", async ({ page }) => {
  await signIn(page);
  await page.goto("/analytics?range=all");
  for (const heading of [
    "Core metrics",
    "Risk metrics",
    "Drawdown analysis",
    "Distributions",
    "Performance by time",
    "Performance breakdowns",
    "Psychology analytics",
    "Mistake analysis",
  ]) {
    await expect(page.getByText(heading, { exact: false }).first()).toBeVisible();
  }
});

test("creating a trade persists it and updates the trades table", async ({ page }) => {
  await signIn(page);
  await page.goto("/trades/new");

  await page.fill('input[name="tradeDate"]', "2026-08-19");
  await page.fill('input[name="entryTime"]', "13:30");
  await page.fill('input[name="exitTime"]', "14:05");
  await page.fill('input[name="symbol"]', "NQ");
  await page.fill('input[name="positionSize"]', "2");
  await page.fill('input[name="entryPrice"]', "20000");
  await page.fill('input[name="exitPrice"]', "20050");
  await page.fill('input[name="stopLoss"]', "19975");
  await page.fill('input[name="takeProfit"]', "20075");
  await page.fill('input[name="fees"]', "4.5");

  // NQ point value is 20 ($5 per 0.25 tick): 50 points × 2 × 20 = $2,000 gross.
  await expect(page.getByText("+$2,000.00", { exact: true })).toBeVisible();
  await expect(page.getByText("+$1,995.50", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /Save trade/i }).click();
  await page.waitForURL(/\/trades\/[a-z0-9]+$/);

  await expect(page.getByRole("heading", { name: /NQ · Long/ })).toBeVisible();
  await expect(page.getByText("+$1,995.50", { exact: true }).first()).toBeVisible();

  // Confirm it survives a fresh read from the database.
  await page.goto("/trades?range=custom&from=2026-08-19&to=2026-08-19");
  await expect(page.getByRole("cell", { name: "NQ" }).first()).toBeVisible();
});

test("filters change the analytics result set", async ({ page }) => {
  await signIn(page);
  await page.goto("/trades?range=all&results=WIN");
  const winsOnly = await page.getByText(/^\d+ trades?$/).first().textContent();

  await page.goto("/trades?range=all");
  const allTrades = await page.getByText(/^\d+ trades?$/).first().textContent();

  expect(parseInt(winsOnly ?? "0", 10)).toBeLessThan(parseInt(allTrades ?? "0", 10));
});

test("journal, goals, calendar and reviews all render", async ({ page }) => {
  await signIn(page);

  await page.goto("/journal");
  await expect(page.getByRole("heading", { name: "Daily journal" })).toBeVisible();

  await page.goto("/goals");
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible();
  await expect(page.getByText(/active goals currently on track/)).toBeVisible();

  await page.goto("/calendar?range=all");
  await expect(page.getByRole("heading", { name: "Calendar", exact: true })).toBeVisible();
  await expect(page.getByText("Monthly performance")).toBeVisible();

  await page.goto("/reviews");
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
});

test("daily journal entry saves", async ({ page }) => {
  await signIn(page);
  await page.goto("/journal?date=2026-08-19");
  await page.fill('textarea[name="didWell"]', "Waited for the London sweep before entering.");
  await page.fill('textarea[name="biggestLesson"]', "Patience at the level pays.");
  await page.getByRole("button", { name: /Save daily review/i }).click();
  await expect(page.getByText("Daily review saved")).toBeVisible();

  await page.reload();
  await expect(page.locator('textarea[name="didWell"]')).toHaveValue(
    "Waited for the London sweep before entering.",
  );
});

test("CSV export returns the trades", async ({ page }) => {
  await signIn(page);
  const response = await page.request.get("/api/export?type=trades&range=all");
  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body.split("\n").length).toBeGreaterThan(10);
  expect(body).toContain("net_pnl");
});

test("protected routes redirect anonymous visitors", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/dashboard");
  await page.waitForURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await context.close();
});

test("sign out clears the session", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard");
  await page.locator('form button[title="Sign out"]').first().click();
  await page.waitForURL("**/login");
});

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  if (page.url().includes("/dashboard")) return;
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard");
}
