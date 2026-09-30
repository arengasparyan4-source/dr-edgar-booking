import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, presetLanguage, snap, trackPageErrors } from "./helpers";
import { SEED, nextWeekday } from "./seed.mjs";

const row = (page: Page, bookingId: string) => page.getByTestId(`booking-row-${bookingId}`);

test.describe("admin", () => {
  test.beforeEach(async ({ context }) => {
    await presetLanguage(context, "ru");
  });

  test("login: wrong password is refused, the right one opens the dashboard", async ({ page }) => {
    await page.goto("/admin/calendar");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.locator("input[type=password]").fill("wrong-password");
    await page.locator("button[type=submit]").click();
    await expect(page.getByText("Неверный пароль")).toBeVisible();
    await loginAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Панель" }).first()).toBeVisible();
  });

  test("an expired session on any admin page leads back to the login page", async ({ page, context }) => {
    await loginAsAdmin(page);
    await context.clearCookies();
    for (const section of ["clients", "bookings", "sms"]) {
      await page.goto(`/admin/${section}`);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
  });

  test("confirm, cancel and mark a past visit as no-show", async ({ page }) => {
    const errors = trackPageErrors(page);
    await loginAsAdmin(page);
    await page.goto("/admin/bookings");

    // Confirm the pending request.
    const pending = row(page, SEED.bookings.pending);
    await pending.getByRole("button", { name: "Подтвердить" }).click();
    await expect(pending.getByText("Подтверждено")).toBeVisible();

    // Cancel a confirmed booking.
    const toCancel = row(page, SEED.bookings.toCancel);
    await toCancel.getByRole("button", { name: "Отменить" }).click();
    await expect(toCancel.getByText("Отменено")).toBeVisible();
    // A cancelled booking offers no further status actions.
    await expect(toCancel.getByRole("button", { name: "Подтвердить" })).toHaveCount(0);

    // The past booking was auto-completed at start; the client did not come.
    const past = row(page, SEED.bookings.past);
    await expect(past.getByText("Завершено")).toBeVisible();
    // No-show is not offered for a future visit.
    await expect(pending.getByTestId("booking-action-no-show")).toHaveCount(0);
    await past.getByTestId("booking-action-no-show").click();
    await expect(past.getByText("Не пришёл").first()).toBeVisible();
    await snap(page, "admin-bookings-after-actions-ru");

    // visitsCount went back down: the client has no visits left.
    const clientResponse = await page.request.get(`/api/admin/clients/${SEED.clients.anna.id}`);
    const client = (await clientResponse.json()).client;
    expect(client.visitsCount ?? 0).toBe(0);

    // Filter by the new status.
    await page.locator("select").filter({ hasText: "Не пришёл" }).selectOption("no_show");
    await expect(row(page, SEED.bookings.past)).toBeVisible();
    await expect(row(page, SEED.bookings.pending)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("calendar: day, week and month views with the period summary", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/calendar");

    await page.getByTestId("calendar-view-week").click();
    await expect(page.getByTestId("calendar-week-grid")).toBeVisible();
    await expect(page.getByTestId("calendar-summary")).toBeVisible();

    await page.getByTestId("calendar-view-day").click();
    await expect(page.getByTestId("calendar-day-grid")).toBeVisible();

    await page.getByTestId("calendar-view-month").click();
    await expect(page.getByTestId("calendar-week-grid")).toHaveCount(0);
    await expect(page.getByTestId("calendar-summary")).toBeVisible();

    // The choice is remembered.
    await page.reload();
    await expect(page.getByTestId("calendar-view-month")).toHaveAttribute("aria-pressed", "true");
  });

  test("manual booking from a free slot with client search", async ({ page }) => {
    await loginAsAdmin(page);
    const date = nextWeekday(new Date(), 2);
    await page.goto("/admin/calendar");
    await page.getByTestId("calendar-view-week").click();

    // Navigate to the week containing the seeded date if needed.
    const slot = page.getByTestId(`free-slot-${date}-17:00`);
    if (!(await slot.isVisible())) {
      await page.getByRole("button", { name: "Вперёд" }).click();
    }
    await slot.click();

    // Russian spelling finds the Armenian name (transliteration).
    await page.getByTestId("manual-booking-client-search").fill("хачатрян");
    const suggestion = page.getByRole("option").filter({ hasText: SEED.clients.aram.fullName });
    await expect(suggestion).toBeVisible();
    await snap(page, "admin-manual-booking-search-ru");
    await suggestion.click();
    await expect(page.getByTestId("manual-booking-selected-client")).toContainText(
      SEED.clients.aram.fullName
    );

    // Date and time come from the clicked slot.
    await expect(page.locator("input[type=date]").last()).toHaveValue(date);
    await expect(page.locator("input[type=time]").first()).toHaveValue("17:00");

    await page.getByRole("group").getByText("Консультация косметолога").click();
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(page.getByTestId("calendar-week-grid").getByText("17:00–17:30")).toBeVisible();

    // Typing an existing phone picks that client instead of creating a new one.
    await page.getByRole("button", { name: "Добавить запись" }).first().click();
    await page.getByTestId("manual-booking-client-search").fill("zzzz");
    await expect(page.getByText("Клиент не найден")).toBeVisible();
    await page.getByTestId("manual-booking-phone").fill("099 111 222");
    await expect(page.getByTestId("manual-booking-phone-match")).toBeVisible();
    await expect(page.getByTestId("manual-booking-selected-client")).toContainText(
      SEED.clients.maria.fullName
    );

    // No duplicates: still exactly one client per phone number.
    const clients: Array<{ normalizedPhone: string }> = (
      await (await page.request.get("/api/admin/clients")).json()
    ).clients;
    for (const seeded of Object.values(SEED.clients)) {
      expect(clients.filter((item) => item.normalizedPhone === seeded.phone)).toHaveLength(1);
    }
  });

  test("portfolio: add a photo, replace it, it shows on the site, then delete", async ({
    page
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/portfolio");
    const fileInput = page.locator("input[type=file]");
    const preview = page.getByTestId("portfolio-draft-preview");
    const loaded = async () =>
      preview.evaluate((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0);

    // Add.
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "photo-a.png"));
    await expect.poll(loaded).toBe(true);
    for (const input of await page.locator("form input:not([type])").all()) {
      if (!(await input.inputValue())) await input.fill("E2E photo");
    }
    await page.getByRole("button", { name: "Сохранить фото" }).click();
    const card = page.locator("article").filter({ hasText: "E2E photo" });
    await expect(card).toHaveCount(1);
    const firstUrl = await card.locator("img").getAttribute("src");

    // Replace: edit, upload another file, save.
    await card.getByRole("button", { name: "Редактировать" }).click();
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "photo-b.png"));
    await expect.poll(async () => preview.getAttribute("src")).not.toBe(firstUrl);
    await expect.poll(loaded).toBe(true);
    await page.getByRole("button", { name: "Сохранить фото" }).click();
    const img = card.locator("img");
    await expect.poll(async () => img.getAttribute("src")).not.toBe(firstUrl);
    // The replaced photo really loads (this was the "brown square" bug).
    await expect
      .poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await snap(page, "admin-portfolio-replaced-ru");

    // It is on the landing page too.
    const newUrl = (await img.getAttribute("src")) ?? "";
    const site = await page.request.get("/api/site-data");
    expect(JSON.stringify(await site.json())).toContain(newUrl);
    expect((await page.request.get(newUrl)).status()).toBe(200);

    // Delete.
    await card.getByRole("button", { name: "Удалить" }).click();
    await expect(page.locator("article").filter({ hasText: "E2E photo" })).toHaveCount(0);
  });
});
