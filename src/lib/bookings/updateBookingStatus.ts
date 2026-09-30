import type { AppData, Booking, BookingStatus, Client } from "@/types/domain";
import { appRepository } from "@/lib/repositories/appRepository";
import {
  assertTransition,
  BOOKING_NOT_STARTED,
  hasBookingStarted,
  isVisitStatus
} from "./bookingStatus";

/**
 * Keeps visitsCount / lastVisitDate in step with a booking that starts or
 * stops counting as a visit (completed <-> no_show).
 */
const applyVisitChange = (
  data: AppData,
  booking: Booking,
  delta: 1 | -1,
  now: string
): Client[] =>
  data.clients.map((client) => {
    if (client.id !== booking.clientId) {
      return client;
    }

    if (delta === 1) {
      return {
        ...client,
        visitsCount: (client.visitsCount ?? 0) + 1,
        lastVisitDate:
          client.lastVisitDate && client.lastVisitDate > booking.date
            ? client.lastVisitDate
            : booking.date,
        updatedAt: now
      };
    }

    // The last visit moves back only if it was this booking's day; then it is
    // the latest other visit this client really made.
    let lastVisitDate = client.lastVisitDate;
    if (lastVisitDate === booking.date) {
      const otherVisits = data.bookings
        .filter(
          (other) =>
            other.id !== booking.id &&
            other.clientId === client.id &&
            isVisitStatus(other.status)
        )
        .map((other) => other.date)
        .sort();
      lastVisitDate = otherVisits.at(-1);
    }

    return {
      ...client,
      visitsCount: Math.max(0, (client.visitsCount ?? 0) - 1),
      lastVisitDate,
      updatedAt: now
    };
  });

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  extra: Partial<Booking> = {}
) {
  let updatedBooking: Booking | undefined;

  // The transition and the visit count are checked and written on the same
  // fresh data, so two clicks cannot both pass and count the visit twice.
  await appRepository.updateData((data) => {
    const booking = data.bookings.find((item) => item.id === bookingId);
    const now = new Date();
    const nowIso = now.toISOString();

    if (!booking) {
      throw new Error("Booking not found");
    }

    assertTransition(booking.status, status);

    if (status === "no_show" && !hasBookingStarted(booking, now)) {
      throw new Error(BOOKING_NOT_STARTED);
    }

    updatedBooking = {
      ...booking,
      ...extra,
      status,
      updatedAt: nowIso
    };

    const wasVisit = isVisitStatus(booking.status);
    const isVisit = isVisitStatus(status);
    const clients =
      booking.clientId && wasVisit !== isVisit
        ? applyVisitChange(data, booking, isVisit ? 1 : -1, nowIso)
        : data.clients;

    return {
      ...data,
      clients,
      bookings: data.bookings.map((item) =>
        item.id === bookingId ? (updatedBooking as Booking) : item
      )
    };
  });

  return updatedBooking ?? null;
}
