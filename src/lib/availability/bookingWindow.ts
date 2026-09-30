import type { Settings } from "@/types/domain";
import { clinicToday, nowInClinic } from "@/lib/time/clinicTime";
import { addDays } from "./time";

export const DEFAULT_MIN_BOOKING_LEAD_MINUTES = 60;
const MIN_BOOKING_HORIZON_DAYS = 7;

/** Earliest clinic date/time a slot may start at. */
export type SlotLowerBound = {
  date: string;
  /** Minutes since clinic midnight on `date`. */
  minutes: number;
};

export type BookingWindow = {
  /** First bookable date: today in the clinic zone. */
  today: string;
  /** Last bookable date, inclusive (today + horizon - 1). */
  lastDate: string;
  /** Slots starting before this are not offered. */
  notBefore: SlotLowerBound;
};

export const getMinBookingLeadMinutes = (settings: Settings) => {
  const value = settings.minBookingLeadMinutes;
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_MIN_BOOKING_LEAD_MINUTES;
};

/**
 * Horizon in days. The landing page shows max(7, bookingHorizonDays) dates, so
 * the server accepts exactly the same range.
 */
export const getBookingHorizonDays = (settings: Settings) =>
  Math.max(MIN_BOOKING_HORIZON_DAYS, settings.bookingHorizonDays || MIN_BOOKING_HORIZON_DAYS);

/** The clinic date/time `leadMinutes` from now; slots before it are not offered. */
export const earliestStartFromNow = (
  leadMinutes: number,
  now: Date = new Date()
): SlotLowerBound => {
  const { date, minutes } = nowInClinic(
    new Date(now.getTime() + Math.max(0, leadMinutes) * 60000)
  );
  return { date, minutes };
};

/** What a client may book on the public site. */
export const getPublicBookingWindow = (
  settings: Settings,
  now: Date = new Date()
): BookingWindow => {
  const today = clinicToday(now);

  return {
    today,
    lastDate: addDays(today, getBookingHorizonDays(settings) - 1),
    notBefore: earliestStartFromNow(getMinBookingLeadMinutes(settings), now)
  };
};

export const DATE_OUT_OF_RANGE = "Date is outside the booking window";

export const assertDateInWindow = (date: string, window: BookingWindow) => {
  if (date < window.today || date > window.lastDate) {
    throw new Error(DATE_OUT_OF_RANGE);
  }
};
