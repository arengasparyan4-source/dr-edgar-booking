import { describe, expect, it } from "vitest";
import { getDashboardStats, summarizePeriod } from "@/lib/bookings/bookingStats";
import type { Booking, BookingStatus } from "@/types/domain";

const TODAY = "2026-09-30";

let number = 0;
const booking = (date: string, status: BookingStatus, totalPrice = 10000): Booking => {
  number += 1;
  return {
    id: `b${number}`,
    firstName: "A",
    lastName: "B",
    phone: "+37477000001",
    selectedServiceIds: [],
    servicesSnapshot: [],
    totalDurationMinutes: 60,
    totalPrice,
    date,
    startTime: "10:00",
    endTime: "11:00",
    status,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`
  };
};

describe("getDashboardStats", () => {
  const bookings = [
    booking("2026-09-28", "pending"),
    booking("2026-10-02", "reschedule_requested"),
    booking(TODAY, "confirmed"),
    booking(TODAY, "cancelled"),
    booking(TODAY, "completed", 40000),
    booking("2026-10-05", "confirmed"),
    booking("2026-09-10", "completed", 60000),
    booking("2026-08-31", "completed", 99000),
    booking("2026-09-12", "no_show"),
    booking("2026-09-13", "cancelled")
  ];

  it("counts every box on the dashboard", () => {
    expect(getDashboardStats(bookings, TODAY)).toEqual({
      newRequests: 2, // pending + reschedule request
      today: 2, // cancelled visits are not "today's bookings"
      upcoming: 3, // open bookings from today on; the past pending one is not upcoming
      cancelled: 2,
      noShow: 1,
      monthRevenue: 100000, // completed in September only
      monthVisits: 2
    });
  });

  it("is all zeros without bookings", () => {
    expect(getDashboardStats([], TODAY)).toMatchObject({ newRequests: 0, monthRevenue: 0 });
  });
});

describe("summarizePeriod", () => {
  it("statuses add up to the total and free slots are summed", () => {
    const period = [
      booking(TODAY, "confirmed"),
      booking(TODAY, "pending"),
      booking(TODAY, "reschedule_requested"),
      booking(TODAY, "cancelled"),
      booking(TODAY, "no_show"),
      booking(TODAY, "completed")
    ];
    const summary = summarizePeriod(period, [3, 0, 5]);

    expect(summary).toEqual({
      total: 6,
      confirmed: 1,
      pending: 2,
      cancelled: 1,
      noShow: 1,
      completed: 1,
      freeSlots: 8
    });
    expect(
      summary.confirmed + summary.pending + summary.cancelled + summary.noShow + summary.completed
    ).toBe(summary.total);
  });
});
