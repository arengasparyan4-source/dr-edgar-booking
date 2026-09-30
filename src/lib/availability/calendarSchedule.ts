import type { AppData, Service, TimeSlot } from "@/types/domain";
import { computeAvailability } from "./getAvailability";
import type { SlotLowerBound } from "./bookingWindow";
import { addDays, getDayOfWeek } from "./time";

/** Grid step of the admin calendar and the size of one "free slot". */
export const CALENDAR_SLOT_MINUTES = 30;

export type CalendarDaySchedule = {
  date: string;
  /** false on a day off: no working hours, no free slots. */
  working: boolean;
  startTime?: string;
  endTime?: string;
  breaks: Array<{ startTime: string; endTime: string }>;
  blocked: Array<{ startTime: string; endTime: string; reason?: string }>;
  /** Free 30-minute slots, computed exactly like the public availability. */
  freeSlots: TimeSlot[];
};

// A neutral 30-minute "service" used only to size the grid slots, so free
// slots come from the same code path as getAvailability (working hours,
// breaks, blocked times, Google busy time, active bookings, "not in the past").
const gridService: Service = {
  id: "__calendar_grid__",
  category: "other",
  name: { hy: "", ru: "", en: "" },
  description: { hy: "", ru: "", en: "" },
  durationMinutes: CALENDAR_SLOT_MINUTES,
  price: 0,
  active: true
};

export function buildCalendarSchedule(
  data: AppData,
  googleBusy: TimeSlot[],
  from: string,
  to: string,
  notBefore: SlotLowerBound
): CalendarDaySchedule[] {
  const days: CalendarDaySchedule[] = [];

  for (let date = from; date <= to && days.length < 62; date = addDays(date, 1)) {
    const hours = data.workingHours.find(
      (item) => item.dayOfWeek === getDayOfWeek(date)
    );
    const working = Boolean(hours?.enabled);
    const { slots } = working
      ? computeAvailability(data, googleBusy, {
          selectedServiceIds: [gridService.id],
          services: [gridService],
          dateFrom: date,
          daysAhead: 1,
          limit: 96,
          notBefore
        })
      : { slots: [] };

    days.push({
      date,
      working,
      startTime: working ? hours?.startTime : undefined,
      endTime: working ? hours?.endTime : undefined,
      breaks: working ? (hours?.breaks ?? []) : [],
      blocked: data.blockedTimes
        .filter((blocked) => blocked.date === date)
        .map(({ startTime, endTime, reason }) => ({ startTime, endTime, reason })),
      freeSlots: slots
    });
  }

  return days;
}
