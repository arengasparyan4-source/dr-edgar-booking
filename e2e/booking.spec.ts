import { expect, test } from "@playwright/test";
import { presetLanguage, snap, trackPageErrors } from "./helpers";
import { clinicDate, nextWeekday } from "./seed.mjs";

const service = "consultation-primary";

const bookingBody = (date: string, startTime: string, endTime: string, phone: string) => ({
  firstName: "Test",
  lastName: "Client",
  phone,
  selectedServiceIds: [service],
  selectedSlot: { date, startTime, endTime },
  comment: ""
});

test.describe("public booking", () => {
  test("a client books a free slot on the landing page", async ({ page, context }) => {
    await presetLanguage(context, "ru");
    const errors = trackPageErrors(page);
    const date = nextWeekday(new Date(), 2);

    await page.goto("/");
    await page.getByTestId(`service-toggle-${service}`).click();
    await page.getByTestId(`booking-date-${date}`).click();
    // 11:00 is taken by the seeded pending booking, 12:00 is free.
    await expect(page.getByTestId("booking-slot-11:00")).toHaveCount(0);
    await page.getByTestId("booking-slot-12:00").click();
    await page.getByTestId("booking-first-name").fill("Սոնա");
    await page.getByTestId("booking-last-name").fill("Test");
    await page.getByTestId("booking-phone").fill("055 123 456");
    await page.getByTestId("booking-submit").click();

    await expect(page.getByTestId("booking-success")).toBeVisible();
    await snap(page, "landing-booking-success-ru");
    expect(errors).toEqual([]);
  });

  test("past dates and past times cannot be booked", async ({ page, request }) => {
    const yesterday = clinicDate(new Date(), -1);

    // The landing page does not even offer yesterday.
    await page.goto("/");
    await page.getByTestId(`service-toggle-${service}`).click();
    await expect(page.getByTestId(`booking-date-${yesterday}`)).toHaveCount(0);

    // The server refuses it too.
    const response = await request.post("/api/booking", {
      data: bookingBody(yesterday, "12:00", "12:30", "+37455000001")
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe("date_out_of_range");

    // Today's slots never start before now (+ the minimum notice).
    const today = clinicDate(new Date());
    const availability = await request.post("/api/availability", {
      data: { selectedServiceIds: [service], dateFrom: today, daysAhead: 1 }
    });
    expect(availability.ok()).toBeTruthy();
    const { slots } = (await availability.json()) as {
      slots: Array<{ date: string; startTime: string }>;
    };
    const nowInClinic = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Yerevan",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(new Date());
    for (const slot of slots.filter((item) => item.date === today)) {
      expect(slot.startTime > nowInClinic).toBeTruthy();
    }
  });

  test("two simultaneous bookings of one slot: one wins, the other gets 409", async ({
    request
  }) => {
    const date = nextWeekday(new Date(), 2);
    const [first, second] = await Promise.all([
      request.post("/api/booking", { data: bookingBody(date, "16:00", "16:30", "+37455000002") }),
      request.post("/api/booking", { data: bookingBody(date, "16:00", "16:30", "+37455000003") })
    ]);
    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = first.status() === 409 ? first : second;
    expect(["slot_taken", "slot_unavailable"]).toContain((await loser.json()).code);
  });
});
