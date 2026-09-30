import { describe, expect, it } from "vitest";
import {
  SLOT_TAKEN,
  SLOT_UNAVAILABLE,
  assertSlotAvailableInData,
  computeAvailability
} from "@/lib/availability/getAvailability";
import { getPublicBookingWindow } from "@/lib/availability/bookingWindow";
import { createDefaultAppData } from "@/lib/data/defaultData";
import type { AppData, Booking, BookingStatus, TimeSlot } from "@/types/domain";

// 2026-09-30 is a Wednesday: 10:00-19:00 with a 13:00-14:00 break.
const WEDNESDAY = "2026-09-30";
const SUNDAY = "2026-10-04";

const baseData = (patch: Partial<AppData> = {}): AppData => {
  const data = createDefaultAppData();
  const consultation = data.services.find((service) => service.id === "consultation-primary")!;
  return {
    ...data,
    // One 30-minute and one 60-minute service keep the numbers readable.
    services: [
      { ...consultation, durationMinutes: 30, active: true },
      { ...consultation, id: "hour", durationMinutes: 60, price: 50000, active: true }
    ],
    bookings: [],
    blockedTimes: [],
    ...patch
  };
};

const booking = (startTime: string, endTime: string, status: BookingStatus = "confirmed", id = startTime): Booking => ({
  id,
  firstName: "A",
  lastName: "B",
  phone: "+37477000001",
  selectedServiceIds: ["hour"],
  servicesSnapshot: [],
  totalDurationMinutes: 60,
  totalPrice: 0,
  date: WEDNESDAY,
  startTime,
  endTime,
  status,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z"
});

const starts = (data: AppData, serviceIds: string[], options: Partial<Parameters<typeof computeAvailability>[2]> = {}, busy: TimeSlot[] = []) =>
  computeAvailability(data, busy, { selectedServiceIds: serviceIds, dateFrom: WEDNESDAY, daysAhead: 1, ...options }).slots.map(
    (slot) => slot.startTime
  );

describe("computeAvailability", () => {
  it("offers 30-minute steps inside working hours around the break", () => {
    const slots = starts(baseData(), ["hour"]);
    expect(slots[0]).toBe("10:00");
    expect(slots).toContain("12:00"); // ends exactly at the break
    expect(slots).not.toContain("12:30"); // would run into the break
    expect(slots).not.toContain("13:00");
    expect(slots).toContain("14:00");
    expect(slots.at(-1)).toBe("18:00"); // ends exactly at closing time
  });

  it("sums durations and prices of several services", () => {
    const result = computeAvailability(baseData(), [], {
      selectedServiceIds: ["consultation-primary", "hour"],
      dateFrom: WEDNESDAY,
      daysAhead: 1
    });
    expect(result.totalDurationMinutes).toBe(90);
    expect(result.totalPrice).toBe(65000);
    expect(result.slots.at(-1)?.startTime).toBe("17:30");
  });

  it("skips days off and refuses unknown or inactive services", () => {
    expect(starts(baseData(), ["hour"], { dateFrom: SUNDAY })).toEqual([]);
    expect(() => starts(baseData(), ["missing"])).toThrow("Invalid selected services");
  });

  it("active bookings, blocked time and Google busy time block slots; cancelled ones do not", () => {
    const data = baseData({
      bookings: [booking("10:00", "11:00"), booking("15:00", "16:00", "cancelled"), booking("16:00", "17:00", "pending")],
      blockedTimes: [{ id: "b", date: WEDNESDAY, startTime: "11:30", endTime: "12:00", reason: "private" }]
    });
    const slots = starts(data, ["consultation-primary"], {}, [{ date: WEDNESDAY, startTime: "17:00", endTime: "17:30" }]);

    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
    expect(slots).not.toContain("11:30");
    expect(slots).toContain("15:00"); // cancelled booking frees its time
    expect(slots).not.toContain("16:00");
    expect(slots).not.toContain("17:00");
    expect(slots).toContain("17:30");
  });

  it("respects notBefore (minimum notice) and lastDate (horizon)", () => {
    expect(starts(baseData(), ["hour"], { notBefore: { date: WEDNESDAY, minutes: 16 * 60 + 10 } })[0]).toBe("16:30");
    expect(
      computeAvailability(baseData(), [], {
        selectedServiceIds: ["hour"],
        dateFrom: WEDNESDAY,
        daysAhead: 5,
        lastDate: "2026-10-01"
      }).slots.every((slot) => slot.date <= "2026-10-01")
    ).toBe(true);
  });

  it("a booking being moved does not block itself, including its own Google event", () => {
    const own = { ...booking("10:00", "11:00", "confirmed", "own"), googleCalendarEventId: "evt" };
    const data = baseData({ bookings: [own] });
    const googleBusy = [{ date: WEDNESDAY, startTime: "10:00", endTime: "11:00" }];

    expect(starts(data, ["hour"], {}, googleBusy)).not.toContain("10:00");
    expect(starts(data, ["hour"], { excludeBookingId: "own" }, googleBusy)).toContain("10:00");
  });
});

describe("assertSlotAvailableInData", () => {
  const data = baseData({ bookings: [booking("10:00", "11:00")] });
  const check = (startTime: string, endTime: string) =>
    assertSlotAvailableInData(data, [], {
      selectedServiceIds: ["hour"],
      slot: { date: WEDNESDAY, startTime, endTime }
    });

  it("passes for a free slot", () => {
    expect(check("11:00", "12:00").slots.length).toBeGreaterThan(0);
  });

  it("SLOT_TAKEN when another booking overlaps (the 409 case)", () => {
    expect(() => check("10:30", "11:30")).toThrow(SLOT_TAKEN);
  });

  it("SLOT_UNAVAILABLE for the break, a wrong length or outside hours", () => {
    expect(() => check("13:00", "14:00")).toThrow(SLOT_UNAVAILABLE);
    expect(() => check("11:00", "11:30")).toThrow(SLOT_UNAVAILABLE);
    expect(() => check("18:30", "19:30")).toThrow(SLOT_UNAVAILABLE);
  });
});

describe("getPublicBookingWindow", () => {
  const settings = createDefaultAppData().settings;

  it("starts today in the clinic zone and adds the minimum notice", () => {
    // 09:40 in Yerevan.
    const window = getPublicBookingWindow({ ...settings, minBookingLeadMinutes: 60, bookingHorizonDays: 14 }, new Date("2026-09-30T05:40:00Z"));
    expect(window.today).toBe(WEDNESDAY);
    expect(window.lastDate).toBe("2026-10-13");
    expect(window.notBefore).toEqual({ date: WEDNESDAY, minutes: 10 * 60 + 40 });
  });

  it("never offers fewer than 7 days", () => {
    const window = getPublicBookingWindow({ ...settings, bookingHorizonDays: 3 }, new Date("2026-09-30T05:40:00Z"));
    expect(window.lastDate).toBe("2026-10-06");
  });
});
