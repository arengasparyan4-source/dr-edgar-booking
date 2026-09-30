import type { Booking, TimeSlot } from "@/types/domain";
import {
  assertSlotAvailableInData,
  fetchGoogleBusyForSlot
} from "@/lib/availability/getAvailability";
import { earliestStartFromNow } from "@/lib/availability/bookingWindow";
import { getGoogleCalendarProvider } from "@/lib/google/googleCalendarProvider";
import { appRepository } from "@/lib/repositories/appRepository";
import {
  cancelBookingScheduledSms,
  dispatchBookingSms,
  scheduleBookingReminders
} from "@/lib/sms/smsService";
import { bookingActionKeyboard } from "@/lib/telegram/sendBookingRequestMessage";
import { editTelegramMessage } from "@/lib/telegram/editTelegramMessage";
import { bookingRequestTelegramText } from "@/lib/telegram/telegramText";
import { sideEffectWarner } from "./sideEffects";

const warnSideEffect = sideEffectWarner("[changeBookingDateTime]");

export async function changeBookingDateTime(bookingId: string, slot: TimeSlot) {
  const warnings: string[] = [];
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "cancelled" || booking.status === "completed") {
    throw new Error("Booking date/time cannot be changed from current status");
  }

  const googleBusy = await fetchGoogleBusyForSlot(slot);
  const notBefore = earliestStartFromNow(0);
  let updatedBooking!: Booking;

  // Status check, slot check and save run on the same fresh data (bug #3).
  const data = await appRepository.updateData((current) => {
    const fresh = current.bookings.find((item) => item.id === bookingId);

    if (!fresh) {
      throw new Error("Booking not found");
    }

    if (fresh.status === "cancelled" || fresh.status === "completed") {
      throw new Error("Booking date/time cannot be changed from current status");
    }

    const availability = assertSlotAvailableInData(current, googleBusy, {
      selectedServiceIds: fresh.selectedServiceIds,
      slot,
      excludeBookingId: fresh.id,
      notBefore,
      // Moving a booking keeps its agreed services, duration and price.
      services: fresh.servicesSnapshot
    });

    updatedBooking = {
      ...fresh,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      servicesSnapshot: availability.services,
      totalDurationMinutes: availability.totalDurationMinutes,
      totalPrice: availability.totalPrice,
      status: fresh.status === "confirmed" ? "confirmed" : "reschedule_requested",
      rescheduleOptions: [{ id: "manual", ...slot }],
      updatedAt: new Date().toISOString()
    };

    return {
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === fresh.id ? updatedBooking : item
      )
    };
  });
  const googleProvider = getGoogleCalendarProvider(data.settings);

  if (updatedBooking.googleCalendarEventId) {
    try {
      await googleProvider.updateCalendarEvent(
        updatedBooking.googleCalendarEventId,
        updatedBooking
      );
    } catch (error) {
      warnSideEffect(warnings, "Google Calendar event update failed", error);
    }
  }

  try {
    // Old reminders no longer match the new date/time — drop and re-create.
    await cancelBookingScheduledSms(updatedBooking.id, ["booking_reminder"]);
    await dispatchBookingSms({
      booking: updatedBooking,
      type: "booking_rescheduled"
    });
    if (updatedBooking.status === "confirmed") {
      await scheduleBookingReminders(updatedBooking);
    }
  } catch (error) {
    warnSideEffect(warnings, "Reschedule SMS failed", error);
  }

  try {
    await editTelegramMessage({
      chatId: updatedBooking.telegramChatId,
      messageId: updatedBooking.telegramMessageId,
      text: bookingRequestTelegramText(updatedBooking),
      replyMarkup: bookingActionKeyboard(updatedBooking.id)
    });
  } catch (error) {
    warnSideEffect(warnings, "Telegram reschedule update failed", error);
  }

  return { booking: updatedBooking, warnings };
}
