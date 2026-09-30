import type { Booking } from "@/types/domain";
import { appRepository } from "@/lib/repositories/appRepository";
import { getGoogleCalendarProvider } from "@/lib/google/googleCalendarProvider";
import {
  cancelBookingScheduledSms,
  dispatchBookingSms
} from "@/lib/sms/smsService";
import { editTelegramMessage } from "@/lib/telegram/editTelegramMessage";
import { cancelledTelegramText } from "@/lib/telegram/telegramText";
import { assertTransition } from "./bookingStatus";
import { sideEffectWarner } from "./sideEffects";

const warnSideEffect = sideEffectWarner("[cancelBooking]");

export async function cancelBooking(bookingId: string) {
  const warnings: string[] = [];
  let updatedBooking!: Booking;

  // Status check and write on the same fresh data: a completed or already
  // cancelled booking is refused before any side effect (no Google delete,
  // no second cancellation SMS).
  const data = await appRepository.updateData((current) => {
    const booking = current.bookings.find((item) => item.id === bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    assertTransition(booking.status, "cancelled");
    const now = new Date().toISOString();
    updatedBooking = {
      ...booking,
      status: "cancelled",
      cancelledAt: now,
      updatedAt: now
    };

    return {
      ...current,
      bookings: current.bookings.map((item) =>
        item.id === bookingId ? updatedBooking : item
      )
    };
  });
  const booking = updatedBooking;

  if (booking.googleCalendarEventId) {
    try {
      await getGoogleCalendarProvider(data.settings).deleteCalendarEvent(
        booking.googleCalendarEventId
      );
    } catch (error) {
      warnSideEffect(warnings, "Google Calendar event deletion failed", error);
    }
  }

  try {
    // Drop any still-scheduled reminders for this booking, then notify.
    await cancelBookingScheduledSms(booking.id, ["booking_reminder"]);
    await dispatchBookingSms({
      booking: updatedBooking,
      type: "booking_cancelled"
    });
  } catch (error) {
    warnSideEffect(warnings, "Cancellation SMS failed", error);
  }

  try {
    await editTelegramMessage({
      chatId: updatedBooking.telegramChatId,
      messageId: updatedBooking.telegramMessageId,
      text: cancelledTelegramText(updatedBooking),
      replyMarkup: { inline_keyboard: [] }
    });
  } catch (error) {
    warnSideEffect(warnings, "Telegram cancellation update failed", error);
  }

  return { booking: updatedBooking, warnings };
}
