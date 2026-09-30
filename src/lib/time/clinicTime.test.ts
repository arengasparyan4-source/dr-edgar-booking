import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, getDayOfWeek, minutesFromTime, subtractInterval, timeFromMinutes } from "@/lib/availability/time";
import {
  clinicToUtc,
  clinicToday,
  getClinicTimeZone,
  getTimeZoneOffsetMinutes,
  nowInClinic,
  toClinicRfc3339,
  toUtcIso,
  utcToClinic
} from "@/lib/time/clinicTime";

describe("clinic time zone (Asia/Yerevan, UTC+4, no DST)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("the clinic day starts four hours before the UTC day", () => {
    expect(clinicToday(new Date("2026-09-29T19:59:00Z"))).toBe("2026-09-29");
    expect(clinicToday(new Date("2026-09-29T20:00:00Z"))).toBe("2026-09-30");
    expect(nowInClinic(new Date("2026-09-29T20:30:00Z"))).toEqual({
      date: "2026-09-30",
      time: "00:30",
      minutes: 30
    });
  });

  it("converts clinic wall time to UTC and back", () => {
    const instant = clinicToUtc("2026-09-30", "10:00");
    expect(instant.toISOString()).toBe("2026-09-30T06:00:00.000Z");
    expect(utcToClinic(instant)).toMatchObject({ date: "2026-09-30", time: "10:00" });
    expect(utcToClinic("2026-12-31T21:15:00Z")).toMatchObject({ date: "2027-01-01", time: "01:15" });
  });

  it("formats RFC3339 with the clinic offset", () => {
    expect(getTimeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(240);
    expect(toClinicRfc3339("2026-09-30", "10:00")).toBe("2026-09-30T10:00:00+04:00");
  });

  it("toUtcIso reads zone-less values as clinic time and keeps zoned ones", () => {
    expect(toUtcIso("2026-07-24T09:00:00")).toBe("2026-07-24T05:00:00.000Z");
    expect(toUtcIso("2026-07-24T09:00:00+04:00")).toBe("2026-07-24T05:00:00.000Z");
    expect(toUtcIso("2026-07-24T05:00:00.000Z")).toBe("2026-07-24T05:00:00.000Z");
    expect(toUtcIso("not a date")).toBe("not a date");
  });

  it("uses CLINIC_TIMEZONE and falls back to Yerevan for an invalid zone", () => {
    vi.stubEnv("CLINIC_TIMEZONE", "Europe/Moscow");
    expect(getClinicTimeZone()).toBe("Europe/Moscow");
    expect(clinicToday(new Date("2026-09-29T20:30:00Z"))).toBe("2026-09-29");

    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubEnv("CLINIC_TIMEZONE", "Mars/Olympus");
    expect(getClinicTimeZone()).toBe("Asia/Yerevan");
  });

  it("rejects invalid dates and instants", () => {
    expect(() => clinicToUtc("2026-09-30", "xx:yy")).toThrow();
    expect(() => utcToClinic("garbage")).toThrow();
  });
});

describe("time helpers", () => {
  it("parses HH:MM strictly, 24:00 is the end of the day", () => {
    expect(minutesFromTime("00:00")).toBe(0);
    expect(minutesFromTime("13:30")).toBe(810);
    expect(minutesFromTime("24:00")).toBe(1440);
    for (const bad of ["24:30", "9:00", "12:60", "", "noon"]) {
      expect(() => minutesFromTime(bad)).toThrow();
    }
    expect(timeFromMinutes(545)).toBe("09:05");
  });

  it("adds days across months, years and leap days", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(getDayOfWeek("2026-09-30")).toBe(3); // Wednesday
  });

  it("subtracts an interval into 0, 1 or 2 pieces", () => {
    const day = { start: 600, end: 1140 };
    expect(subtractInterval(day, { start: 780, end: 840 })).toEqual([
      { start: 600, end: 780 },
      { start: 840, end: 1140 }
    ]);
    expect(subtractInterval(day, { start: 500, end: 700 })).toEqual([{ start: 700, end: 1140 }]);
    expect(subtractInterval(day, { start: 0, end: 1440 })).toEqual([]);
    expect(subtractInterval(day, { start: 1140, end: 1200 })).toEqual([day]);
  });
});
