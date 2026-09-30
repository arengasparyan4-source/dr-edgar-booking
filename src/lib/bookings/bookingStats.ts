import type { Booking, BookingStatus } from "@/types/domain";

/**
 * Booking counters for the dashboard and the calendar summary. Pure: the
 * clinic "today" is passed in.
 */

const waitingStatuses: BookingStatus[] = ["pending", "reschedule_requested"];
const openStatuses: BookingStatus[] = ["pending", "confirmed", "reschedule_requested"];

export type DashboardStats = {
  /** Requests waiting for the doctor's answer (any date). */
  newRequests: number;
  /** Today's visits that are still on (cancelled ones do not count). */
  today: number;
  /** Open bookings from today on. */
  upcoming: number;
  cancelled: number;
  noShow: number;
  /** Sum of completed bookings in the current calendar month, AMD. */
  monthRevenue: number;
  /** Completed visits in the current calendar month. */
  monthVisits: number;
};

export function getDashboardStats(bookings: Booking[], today: string): DashboardStats {
  const month = today.slice(0, 7);
  const completedThisMonth = bookings.filter(
    (booking) =>
      booking.status === "completed" && booking.date.startsWith(month) && booking.date <= today
  );

  return {
    newRequests: bookings.filter((booking) => waitingStatuses.includes(booking.status)).length,
    today: bookings.filter(
      (booking) => booking.date === today && booking.status !== "cancelled"
    ).length,
    upcoming: bookings.filter(
      (booking) => booking.date >= today && openStatuses.includes(booking.status)
    ).length,
    cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
    noShow: bookings.filter((booking) => booking.status === "no_show").length,
    monthRevenue: completedThisMonth.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
    monthVisits: completedThisMonth.length
  };
}

export type PeriodSummary = {
  total: number;
  confirmed: number;
  /** Waiting for an answer: pending and reschedule requests. */
  pending: number;
  cancelled: number;
  noShow: number;
  completed: number;
  freeSlots: number;
};

/**
 * Totals for a calendar period. Every booking in the period counts once, so
 * confirmed + pending + cancelled + noShow + completed === total.
 */
export function summarizePeriod(
  bookings: Booking[],
  freeSlotsPerDay: number[]
): PeriodSummary {
  const count = (...statuses: BookingStatus[]) =>
    bookings.filter((booking) => statuses.includes(booking.status)).length;

  return {
    total: bookings.length,
    confirmed: count("confirmed"),
    pending: count(...waitingStatuses),
    cancelled: count("cancelled"),
    noShow: count("no_show"),
    completed: count("completed"),
    freeSlots: freeSlotsPerDay.reduce((sum, value) => sum + value, 0)
  };
}
