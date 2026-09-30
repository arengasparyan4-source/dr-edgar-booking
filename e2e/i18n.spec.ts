import { expect, test } from "@playwright/test";
import { translations } from "../src/data/translations";
import { adminTranslations } from "../src/lib/i18n/adminTranslations";
import { LANGS, loginAsAdmin, presetLanguage, snap, trackPageErrors } from "./helpers";

const languageLabel = { hy: "Հայերեն", ru: "Русский", en: "English" } as const;
const shortLabel = { hy: "Հայ", ru: "Рус", en: "Eng" } as const;

test.describe("languages", () => {
  test("landing: Armenian by default, switching to all three languages is remembered", async ({
    page
  }) => {
    const errors = trackPageErrors(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "hy");
    await expect(page.getByText(translations.hy.booking.submit).first()).toBeVisible();

    for (const lang of LANGS) {
      await page.getByRole("button", { name: languageLabel[lang], exact: true }).click();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByText(translations[lang].booking.submit).first()).toBeVisible();
    }

    // English was chosen last and survives a reload (without hydration errors).
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByText(translations.en.booking.submit).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("admin: the language switch changes the whole page and is remembered", async ({ page }) => {
    const errors = trackPageErrors(page);
    await loginAsAdmin(page);
    await expect(page.getByRole("link", { name: adminTranslations.hy.nav.calendar }).first()).toBeVisible();

    for (const lang of LANGS) {
      await page.getByRole("button", { name: shortLabel[lang], exact: true }).click();
      const t = adminTranslations[lang];
      // Header, sidebar and page content all switch at once.
      await expect(page.getByRole("link", { name: t.nav.calendar }).first()).toBeVisible();
      await expect(page.getByText(t.dashboard.newRequests)).toBeVisible();
      await expect(page.getByRole("button", { name: t.nav.logout })).toBeVisible();
    }

    await page.goto("/admin/calendar");
    await expect(page.getByText(adminTranslations.en.calendar.summaryTitle)).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const lang of LANGS) {
    test(`screenshots of key screens (${lang})`, async ({ page, context }) => {
      await presetLanguage(context, lang);
      const errors = trackPageErrors(page);
      await page.goto("/");
      await expect(page.getByText(translations[lang].booking.submit).first()).toBeVisible();
      await snap(page, `${lang}-landing`);

      await loginAsAdmin(page);
      await snap(page, `${lang}-admin-dashboard`);

      await page.goto("/admin/calendar");
      await page.getByTestId("calendar-view-week").click();
      await expect(page.getByTestId("calendar-week-grid")).toBeVisible();
      await snap(page, `${lang}-admin-calendar-week`);
      await page.getByTestId("calendar-view-month").click();
      await snap(page, `${lang}-admin-calendar-month`);

      for (const section of ["bookings", "clients", "sms", "portfolio"]) {
        await page.goto(`/admin/${section}`);
        await page.waitForLoadState("networkidle");
        await snap(page, `${lang}-admin-${section}`);
      }

      // Phone layout of the calendar.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/admin/calendar");
      await page.getByTestId("calendar-view-day").click();
      await expect(page.getByTestId("calendar-day-grid")).toBeVisible();
      await snap(page, `${lang}-admin-calendar-day-mobile`);
      expect(errors).toEqual([]);
    });
  }
});
