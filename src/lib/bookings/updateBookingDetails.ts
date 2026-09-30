import type { Booking, Service } from "@/types/domain";
import {
  assertSlotAvailableInData,
  fetchGoogleBusyForSlot,
  SLOT_UNAVAILABLE
} from "@/lib/availability/getAvailability";
import { minutesFromTime, timeFromMinutes } from "@/lib/availability/time";
import { getGoogleCalendarProvider } from "@/lib/google/googleCalendarProvider";
import { appRepository } from "@/lib/repositories/appRepository";
import { sideEffectWarner } from "./sideEffects";

const warnSideEffect = sideEffectWarner("[updateBookingDetails]");

export async function updateBookingDetails(
  bookingId: string,
  input: {
    selectedServiceIds?: string[];
    comment?: string;
  }
) {
  const warnings: string[] = [];
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  const selectedServiceIds = input.selectedServiceIds?.filter(Boolean);
  const changesServices = Boolean(selectedServiceIds?.length);
  const googleBusy = changesServices ? await fetchGoogleBusyForSlot(booking) : [];
  let updatedBooking!: Booking;

  // Everything is decided on the same fresh data it is saved to (bug #3).
  await appRepository.updateData((current) => {
    const fresh = current.bookings.find((item) => item.id === bookingId);

    if (!fresh) {
      throw new Error("Booking not found");
    }

    const patch: Partial<Booking> = {};

    if (input.comment !== undefined) {
      patch.comment = input.comment;
    }

    if (selectedServiceIds?.length) {
      if (fresh.status === "cancelled" || fresh.status === "completed") {
        throw new Error("Booking services cannot be changed from current status");
      }

      // A service the booking already has is kept as agreed (snapshot), even
      // if it was deactivated or deleted since; newly added ones must be active.
      const services = selectedServiceIds.map(
        (serviceId) =>
          fresh.servicesSnapshot.find((service) => service.id === serviceId) ??
          current.services.find(
            (service) => service.active && service.id === serviceId
          )
      );

      if (services.some((service) => !service)) {
        throw new Error("Invalid selected services");
      }

      const resolvedServices = services as Service[];
      const totalDurationMinutes = resolvedServices.reduce(
        (sum, service) => sum + service.durationMinutes,
        0
      );
      const totalPrice = resolvedServices.reduce(
        (sum, service) => sum + service.price,
        0
      );
      const endTime = timeFromMinutes(
        minutesFromTime(fresh.startTime) + totalDurationMinutes
      );

      // Google busy time was fetched for the date read above; if the date was
      // changed meanwhile, ask for a retry rather than skip that check.
      if (fresh.date !== booking.date) {
        throw new Error(SLOT_UNAVAILABLE);
      }

      assertSlotAvailableInData(current, googleBusy, {
        selectedServiceIds,
        slot: {
          date: fresh.date,
          startTime: fresh.startTime,
          endTime
        },
        excludeBookingId: fresh.id,
        services: resolvedServices
      });

      patch.selectedServiceIds = selectedServiceIds;
      patch.servicesSnapshot = resolvedServices;
      patch.totalDurationMinutes = totalDurationMinutes;
      patch.totalPrice = totalPrice;
      patch.endTime = endTime;
    }

    updatedBooking = { ...fresh, ...patch, updatedAt: new Date().toISOString() };

    return {
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === fresh.id ? updatedBooking : item
      )
    };
  });

  if (updatedBooking.googleCalendarEventId) {
    try {
      const data = await appRepository.getData();
      await getGoogleCalendarProvider(data.settings).updateCalendarEvent(
        updatedBooking.googleCalendarEventId,
        updatedBooking
      );
    } catch (error) {
      warnSideEffect(warnings, "Google Calendar event update failed", error);
    }
  }

  return { booking: updatedBooking, warnings };
}
