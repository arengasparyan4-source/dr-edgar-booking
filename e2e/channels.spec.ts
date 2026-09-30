import { expect, test } from "@playwright/test";
import { loginAsAdmin, presetLanguage, snap, trackPageErrors } from "./helpers";
import { SEED, nextWeekday } from "./seed.mjs";

const phone = "+37455777888";

test.describe("preferred message channel", () => {
  test.beforeEach(async ({ context }) => {
    await presetLanguage(context, "ru");
  });

  test("a client picks Viber on the landing page; the admin shows it everywhere", async ({
    page
  }) => {
    const errors = trackPageErrors(page);
    const date = nextWeekday(new Date(), 2);

    await page.goto("/");
    await page.getByTestId("service-toggle-consultation-primary").click();
    await page.getByTestId(`booking-date-${date}`).click();
    await page.getByTestId("booking-slot-14:00").click();
    await page.getByTestId("booking-first-name").fill("Viber");
    await page.getByTestId("booking-last-name").fill("Client");
    await page.getByTestId("booking-phone").fill("055 777 888");

    const channel = page.getByTestId("booking-channel");
    await expect(channel).toContainText("Куда вам удобнее получать напоминания?");
    // SMS is preselected.
    await expect(page.getByTestId("booking-channel-sms")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("booking-channel-viber").click();
    await expect(page.getByTestId("booking-channel-viber")).toHaveAttribute("aria-checked", "true");
    await snap(page, "landing-channel-choice-ru");
    await page.getByTestId("booking-submit").click();
    await expect(page.getByTestId("booking-success")).toBeVisible();

    // Clients list: badge and channel filter.
    await loginAsAdmin(page);
    const clients: Array<{ id: string; normalizedPhone: string; preferredChannel?: string }> = (
      await (await page.request.get("/api/admin/clients")).json()
    ).clients;
    const client = clients.find((item) => item.normalizedPhone === phone);
    expect(client?.preferredChannel).toBe("viber");

    await page.goto("/admin/clients");
    await page.getByTestId("clients-channel-filter").selectOption("viber");
    await expect(page.getByTestId(`client-row-channel-${client!.id}`)).toContainText("Viber");
    // Other channels are filtered out.
    await expect(page.getByTestId(`client-row-channel-${SEED.clients.maria.id}`)).toHaveCount(0);
    await snap(page, "admin-clients-channel-filter-ru");

    // Client card.
    await page.goto(`/admin/clients/${client!.id}`);
    await expect(page.getByTestId("client-header-channel")).toContainText("Viber");

    // Messages: the "request received" message went to the Viber queue (demo).
    await page.goto("/admin/sms");
    await expect(page.getByTestId("sms-channel-status-viber")).toContainText("Не подключён");
    await page.getByRole("button", { name: "Отправленные SMS" }).click();
    await page.getByTestId("sms-channel-filter-archive").selectOption("viber");
    const row = page.locator("tr").filter({ hasText: "Viber Client" }).first();
    await expect(row).toBeVisible();
    await expect(row.getByTestId("channel-badge-viber")).toBeVisible();
    await snap(page, "admin-sms-channels-ru");
    expect(errors).toEqual([]);
  });

  test("the doctor changes a client's channel from the booking", async ({ page }) => {
    await loginAsAdmin(page);
    const date = nextWeekday(new Date(), 2);
    await page.goto("/admin/calendar");
    await page.getByTestId("calendar-view-week").click();
    const booking = page.getByTestId(`calendar-booking-${SEED.bookings.pending}`);
    if (!(await page.getByTestId(`calendar-column-${date}`).isVisible())) {
      await page.getByRole("button", { name: "Вперёд" }).click();
    }
    await booking.click();

    const drawer = page.getByTestId("booking-channel");
    await expect(page.getByTestId("booking-drawer-channel-sms")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("booking-drawer-channel-telegram").click();
    await expect(page.getByText("Канал сохранён")).toBeVisible();
    await expect(page.getByTestId("booking-drawer-channel-telegram")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(drawer).toBeVisible();

    const client = (
      await (await page.request.get(`/api/admin/clients/${SEED.clients.aram.id}`)).json()
    ).client;
    expect(client.preferredChannel).toBe("telegram");

    // Manual booking preselects the client's channel.
    await page.goto("/admin/calendar");
    await page.getByRole("button", { name: "Добавить запись" }).first().click();
    await page.getByTestId("manual-booking-client-search").fill("арам");
    await page.getByRole("option").filter({ hasText: SEED.clients.aram.fullName }).click();
    await expect(page.getByTestId("manual-channel-telegram")).toHaveAttribute("aria-checked", "true");
  });
});
