import type { Booking, BookingStatus } from "@/types/domain";
import { clinicToUtc } from "@/lib/time/clinicTime";

export const STATUS_TRANSITION_NOT_ALLOWED = "Booking status transition not allowed";
export const BOOKING_NOT_STARTED = "Booking has not started yet";

/**
 * Allowed status changes. cancelled is final: a cancelled visit cannot be
 * completed (it never happened). A completed visit cannot be cancelled (it
 * would undo a counted visit and message the client), but it can be
 * corrected to no_show when the client in fact did not come - and a no_show
 * back to completed when that mark was a mistake. Repeating a status is
 * refused, so a double click cannot count a visit twice or send a second SMS.
 *
 * no_show is only reachable from a visit that was expected to happen
 * (confirmed or already auto-completed), and only once it has started; see
 * assertBookingStarted.
 */
const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "reschedule_requested", "cancelled", "completed"],
  reschedule_requested: ["pending", "confirmed", "cancelled", "completed"],
  confirmed: ["reschedule_requested", "cancelled", "completed", "no_show"],
  cancelled: [],
  completed: ["no_show"],
  no_show: ["completed"]
};

export const canTransition = (from: BookingStatus, to: BookingStatus) =>
  allowedTransitions[from]?.includes(to) ?? false;

export function assertTransition(from: BookingStatus, to: BookingStatus) {
  if (!canTransition(from, to)) {
    throw new Error(STATUS_TRANSITION_NOT_ALLOWED);
  }
}

/** Statuses that mean "the client visited" and count towards visitsCount. */
export const isVisitStatus = (status: BookingStatus) => status === "completed";

/** Whether the booking's start time (clinic zone) is already in the past. */
export const hasBookingStarted = (
  booking: Pick<Booking, "date" | "startTime">,
  now: Date = new Date()
) => {
  try {
    return clinicToUtc(booking.date, booking.startTime).getTime() <= now.getTime();
  } catch {
    return false;
  }
};

/** Whether "client did not come" may be set now (see allowedTransitions). */
export const canMarkNoShow = (booking: Booking, now: Date = new Date()) =>
  canTransition(booking.status, "no_show") && hasBookingStarted(booking, now);
