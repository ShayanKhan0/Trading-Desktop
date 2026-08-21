import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright resolves its own browser download on a normal machine. This project
 * is also developed inside a container that ships a prebuilt Chromium at a fixed
 * path, so use that when it is present and otherwise fall back to the standard
 * resolution — a hardcoded path would make the suite unrunnable anywhere else.
 */
const containerChromium = "/opt/pw-browsers/chromium";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ??
  (existsSync(containerChromium) ? containerChromium : undefined);

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // Point at a deployment to run the same suite against it:
    //   E2E_BASE_URL=https://your-app.vercel.app npx playwright test
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    trace: "off",
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
