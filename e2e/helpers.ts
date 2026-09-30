import fs from "node:fs";
import path from "node:path";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { E2E_ADMIN_PASSWORD } from "./seed.mjs";

export type Lang = "hy" | "ru" | "en";
export const LANGS: Lang[] = ["hy", "ru", "en"];

const screenshotDir = path.join(process.cwd(), "test-results", "screenshots");

/** Saves a full-page screenshot to test-results/screenshots/<name>.png. */
export async function snap(page: Page, name: string) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

/** Presets the remembered language of the landing page and the admin. */
export async function presetLanguage(context: BrowserContext, lang: Lang) {
  await context.addInitScript((value) => {
    window.localStorage.setItem("dr_edgar_site_language", value);
    window.localStorage.setItem("dr_edgar_admin_language", value);
  }, lang);
}

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.locator("input[type=password]").fill(E2E_ADMIN_PASSWORD);
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

/** Collects uncaught page errors and console errors (e.g. hydration). */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}
