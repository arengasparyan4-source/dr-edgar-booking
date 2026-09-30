import type { Booking } from "@/types/domain";
import {
  assertSlotAvailableInData,
  fetchGoogleBusyForSlot,
  SLOT_UNAVAILABLE
} from "@/lib/availability/getAvailability";
import { appRepository } from "@/lib/repositories/appRepository";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import { getGoogleCalendarProvider } from "@/lib/google/googleCalendarProvider";
import {
  dispatchBookingSms,
  scheduleBookingReminders
} from "@/lib/sms/smsService";
import { editTelegramMessage } from "@/lib/telegram/editTelegramMessage";
import { confirmedTelegramText } from "@/lib/telegram/telegramText";
import { sideEffectWarner } from "./sideEffects";

const warnSideEffect = sideEffectWarner("[confirmBooking]");

export async function confirmBooking(bookingId: string) {
  const warnings: string[] = [];
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (!["pending", "reschedule_requested"].includes(booking.status)) {
    throw new Error("Booking cannot be confirmed from current status");
  }

  const googleBusy = await fetchGoogleBusyForSlot(booking);
  let updatedBooking!: Booking;

  // Re-check the slot and flip the status in one write on fresh data, so two
  // overlapping pending requests cannot both be confirmed (bug #3).
  const data = await appRepository.updateData((current) => {
    const fresh = current.bookings.find((item) => item.id === bookingId);

    if (!fresh) {
      throw new Error("Booking not found");
    }

    if (!["pending", "reschedule_requested"].includes(fresh.status)) {
      throw new Error("Booking cannot be confirmed from current status");
    }

    // Google busy time was fetched for the date read above; if the date was
    // changed meanwhile, ask for a retry rather than skip that check.
    if (fresh.date !== booking.date) {
      throw new Error(SLOT_UNAVAILABLE);
    }

    assertSlotAvailableInData(current, googleBusy, {
      selectedServiceIds: fresh.selectedServiceIds,
      slot: {
        date: fresh.date,
        startTime: fresh.startTime,
        endTime: fresh.endTime
      },
      excludeBookingId: fresh.id,
      // Agreed services/duration, even if the service was edited or
      // deactivated since the request.
      services: fresh.servicesSnapshot
    });

    updatedBooking = {
      ...fresh,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === fresh.id ? updatedBooking : item
      )
    };
  });

  // The calendar event is created only after the slot is secured.
  if (!updatedBooking.googleCalendarEventId) {
    try {
      const googleCalendarEventId = await getGoogleCalendarProvider(
        data.settings
      ).createCalendarEvent(updatedBooking);

      if (googleCalendarEventId) {
        updatedBooking =
          (await appRepository.updateBooking(updatedBooking.id, {
            googleCalendarEventId
          })) ?? { ...updatedBooking, googleCalendarEventId };
      }
    } catch (error) {
      warnSideEffect(warnings, "Google Calendar event creation failed", error);
    }
  }

  if (updatedBooking.clientId) {
    await clientsRepository.updateClient(updatedBooking.clientId, {
      nextBookingDate: updatedBooking.date
    });
  }

  try {
    // Confirmation SMS is created in the queue (and sent when dispatch is
    // allowed); dedupe prevents a second SMS if the booking was already
    // confirmed. A reminder is scheduled for the configured offset.
    await dispatchBookingSms({
      booking: updatedBooking,
      type: "booking_confirmation"
    });
    await scheduleBookingReminders(updatedBooking);
  } catch (error) {
    warnSideEffect(warnings, "Confirmation SMS failed", error);
  }

  try {
    await editTelegramMessage({
      chatId: updatedBooking.telegramChatId,
      messageId: updatedBooking.telegramMessageId,
      text: confirmedTelegramText(updatedBooking),
      replyMarkup: { inline_keyboard: [] }
    });
  } catch (error) {
    warnSideEffect(warnings, "Telegram confirmation update failed", error);
  }

  return { booking: updatedBooking, warnings };
}
