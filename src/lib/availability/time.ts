import type { TimeSlot } from "@/types/domain";

export type Interval = {
  start: number;
  end: number;
};

/**
 * "HH:MM" -> minutes since midnight. "24:00" is accepted as the end-of-day
 * marker. Anything else throws: a NaN here used to make every overlap test
 * false, i.e. every slot looked free (bug #14).
 */
export const minutesFromTime = (time: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  const hours = match ? Number(match[1]) : NaN;
  const minutes = match ? Number(match[2]) : NaN;
  const valid =
    match !== null &&
    minutes < 60 &&
    (hours < 24 || (hours === 24 && minutes === 0));

  if (!valid) {
    throw new Error(`Invalid time value: ${String(time)}`);
  }

  return hours * 60 + minutes;
};

export const timeFromMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const addDays = (date: string, days: number) => {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = value.getUTCFullYear();
  const nextMonth = String(value.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(value.getUTCDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};

export const getDayOfWeek = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay();

export const intervalsOverlap = (first: Interval, second: Interval) =>
  first.start < second.end && second.start < first.end;

/** Parts of `interval` not covered by `cut` (0, 1 or 2 pieces). */
export const subtractInterval = (interval: Interval, cut: Interval): Interval[] => {
  if (!intervalsOverlap(interval, cut)) {
    return [interval];
  }

  return [
    { start: interval.start, end: Math.min(interval.end, cut.start) },
    { start: Math.max(interval.start, cut.end), end: interval.end }
  ].filter((piece) => piece.start < piece.end);
};

export const slotToInterval = (slot: Pick<TimeSlot, "startTime" | "endTime">) => ({
  start: minutesFromTime(slot.startTime),
  end: minutesFromTime(slot.endTime)
});
