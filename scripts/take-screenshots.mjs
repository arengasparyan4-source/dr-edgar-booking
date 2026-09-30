/**
 * Screenshots for the README (docs/screenshots). Run against a server that
 * uses the demo data only (`npm run demo:setup`, then `npm run build` and
 * `npm start`):
 *
 *   node scripts/take-screenshots.mjs [baseUrl] [password]
 *
 * Defaults: http://localhost:3000 and the demo password.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.argv[2] ?? "http://localhost:3000";
const password = process.argv[3] ?? "demo-edgar";
const outDir = path.join(process.cwd(), "docs", "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function session(lang, viewport = { width: 1280, height: 860 }) {
  const context = await browser.newContext({ viewport, timezoneId: "Asia/Yerevan", deviceScaleFactor: 1 });
  await context.addInitScript((value) => {
    window.localStorage.setItem("dr_edgar_site_language", value);
    window.localStorage.setItem("dr_edgar_admin_language", value);
  }, lang);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`${lang} ${page.url()}: ${error}`));
  return { context, page };
}

async function login(page) {
  await page.goto(`${baseUrl}/admin/login`);
  await page.locator("input[type=password]").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/admin\/dashboard/);
  await page.waitForLoadState("networkidle");
}

const shot = async (page, name, options = {}) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), ...options });
  console.log(`docs/screenshots/${name}.png`);
};

for (const lang of ["hy", "en"]) {
  const { context, page } = await session(lang);
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await shot(page, `${lang}-landing`);
  await page.getByTestId("booking-submit").scrollIntoViewIfNeeded();
  const form = page.locator("form").filter({ has: page.getByTestId("booking-submit") });
  await page.waitForTimeout(400);
  await form.screenshot({ path: path.join(outDir, `${lang}-booking-form.png`) });
  console.log(`docs/screenshots/${lang}-booking-form.png`);

  await login(page);
  await shot(page, `${lang}-admin-dashboard`, { fullPage: true });

  await page.goto(`${baseUrl}/admin/calendar`);
  await page.getByTestId("calendar-view-week").click();
  await page.getByTestId("calendar-week-grid").waitFor();
  await shot(page, `${lang}-admin-calendar-week`, { fullPage: true });
  await page.getByTestId("calendar-view-month").click();
  await shot(page, `${lang}-admin-calendar-month`, { fullPage: true });

  await page.goto(`${baseUrl}/admin/clients`);
  await page.waitForLoadState("networkidle");
  await shot(page, `${lang}-admin-clients`);

  await page.goto(`${baseUrl}/admin/clients/client_demo_02`);
  await page.waitForLoadState("networkidle");
  await shot(page, `${lang}-admin-client-card`);

  await page.goto(`${baseUrl}/admin/sms`);
  await page.waitForLoadState("networkidle");
  await shot(page, `${lang}-admin-messages`);
  await context.close();
}

// Phone layout.
{
  const { context, page } = await session("hy", { width: 390, height: 844 });
  await login(page);
  await page.goto(`${baseUrl}/admin/calendar`);
  await page.getByTestId("calendar-view-day").click();
  await page.getByTestId("calendar-day-grid").waitFor();
  await shot(page, "hy-admin-calendar-day-mobile");
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await shot(page, "hy-landing-mobile");
  await context.close();
}

// Login page with the demo hint.
{
  const { context, page } = await session("en");
  await page.goto(`${baseUrl}/admin/login`);
  await page.getByTestId("demo-login-hint").waitFor();
  await shot(page, "en-admin-login-demo");
  await context.close();
}

await browser.close();
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
