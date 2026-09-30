import type { TimeSlot } from "@/types/domain";
import { addDays } from "@/lib/availability/time";
import { getClinicTimeZone, utcToClinic } from "@/lib/time/clinicTime";

/** End-of-day marker for a busy piece that runs until clinic midnight. */
export const END_OF_DAY = "24:00";

/**
 * Converts one Google freeBusy interval (RFC3339 instants, normally UTC) into
 * clinic wall-clock slots, one per clinic day it touches. An event from 22:00
 * to 02:00 becomes `[d 22:00-24:00, d+1 00:00-02:00]`; a multi-day event also
 * blocks every whole day in between.
 */
export function busyIntervalToClinicSlots(
  start: string,
  end: string,
  timeZone: string = getClinicTimeZone()
): TimeSlot[] {
  const startInstant = new Date(start);
  const endInstant = new Date(end);

  if (
    Number.isNaN(startInstant.getTime()) ||
    Number.isNaN(endInstant.getTime()) ||
    endInstant.getTime() <= startInstant.getTime()
  ) {
    return [];
  }

  const from = utcToClinic(startInstant, timeZone);
  const to = utcToClinic(endInstant, timeZone);
  const slots: TimeSlot[] = [];

  for (let date = from.date; date <= to.date; date = addDays(date, 1)) {
    const startTime = date === from.date ? from.time : "00:00";
    const endTime = date === to.date ? to.time : END_OF_DAY;

    // An event ending exactly at midnight leaves nothing on the next day.
    if (startTime < endTime) {
      slots.push({ date, startTime, endTime });
    }
  }

  return slots;
}

export function freeBusyToClinicSlots(
  busy: Array<{ start: string; end: string }>,
  timeZone: string = getClinicTimeZone()
): TimeSlot[] {
  return busy.flatMap((event) =>
    busyIntervalToClinicSlots(event.start, event.end, timeZone)
  );
}
