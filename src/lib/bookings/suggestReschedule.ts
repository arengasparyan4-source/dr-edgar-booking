import type { Booking, RescheduleOption, TimeSlot } from "@/types/domain";
import { getAvailability } from "@/lib/availability/getAvailability";
import {
  earliestStartFromNow,
  getMinBookingLeadMinutes
} from "@/lib/availability/bookingWindow";
import { appRepository } from "@/lib/repositories/appRepository";
import { enqueueSms } from "@/lib/sms/smsService";
import { bookingActionKeyboard } from "@/lib/telegram/sendBookingRequestMessage";
import { editTelegramMessage } from "@/lib/telegram/editTelegramMessage";
import {
  buildCallbackData,
  callbackActions
} from "@/lib/telegram/callbackData";
import {
  bookingRequestTelegramText,
  rescheduleSentTelegramText,
  rescheduleTelegramText
} from "@/lib/telegram/telegramText";
import { clinicToday } from "@/lib/time/clinicTime";
import { rescheduleSms } from "./messages";
import { sideEffectWarner } from "./sideEffects";

const alternativeSlotsLimit = 5;
const rescheduleSearchDays = 14;

const slotButtonText = (slot: TimeSlot) =>
  `${slot.date.slice(5).replace("-", ".")} ${slot.startTime}-${slot.endTime}`;

const warnSideEffect = sideEffectWarner("[suggestReschedule]");

const sameSlot = (first: TimeSlot, second: TimeSlot) =>
  first.date === second.date &&
  first.startTime === second.startTime &&
  first.endTime === second.endTime;

async function getReschedulableBooking(bookingId: string) {
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "cancelled" || booking.status === "completed") {
    throw new Error("Booking date/time cannot be changed from current status");
  }

  return booking;
}

/**
 * Free slots to offer instead of the booking's current time: searched from
 * max(today, booking date), never in the past, never the current time itself.
 */
// Options go to the client, so the same minimum notice as on the site applies.
async function getOptionLowerBound() {
  const data = await appRepository.getData();
  return earliestStartFromNow(getMinBookingLeadMinutes(data.settings));
}

async function findRescheduleOptions(booking: Booking): Promise<RescheduleOption[]> {
  const today = clinicToday();
  const availability = await getAvailability({
    selectedServiceIds: booking.selectedServiceIds,
    dateFrom: booking.date > today ? booking.date : today,
    daysAhead: rescheduleSearchDays,
    // One extra, because the booking's own time can be in the list.
    limit: alternativeSlotsLimit + 1,
    excludeBookingId: booking.id,
    services: booking.servicesSnapshot,
    notBefore: await getOptionLowerBound()
  });

  return availability.slots
    .filter((slot) => !sameSlot(slot, booking))
    .slice(0, alternativeSlotsLimit)
    .map((slot, index) => ({ id: String(index + 1), ...slot }));
}

async function isOptionStillFree(booking: Booking, option: TimeSlot) {
  const availability = await getAvailability({
    selectedServiceIds: booking.selectedServiceIds,
    dateFrom: option.date,
    daysAhead: 1,
    limit: 96,
    excludeBookingId: booking.id,
    services: booking.servicesSnapshot,
    notBefore: await getOptionLowerBound()
  });

  return availability.slots.some((slot) => sameSlot(slot, option));
}

/**
 * Shows the doctor a list of free slots as Telegram buttons. The list is
 * stored in booking.rescheduleOptions so that pressing a button resolves to
 * exactly the slot that was shown, whatever changes in the schedule meanwhile.
 */
export async function showRescheduleOptions(bookingId: string) {
  const booking = await getReschedulableBooking(bookingId);
  const options = await findRescheduleOptions(booking);
  const updatedBooking =
    (await appRepository.updateBooking(booking.id, {
      rescheduleOptions: options
    })) ?? booking;

  await editTelegramMessage({
    chatId: updatedBooking.telegramChatId,
    messageId: updatedBooking.telegramMessageId,
    text: rescheduleTelegramText(updatedBooking, options),
    replyMarkup: {
      inline_keyboard: [
        ...options.map((option) => [
          {
            text: slotButtonText(option),
            callback_data: buildCallbackData(
              callbackActions.offerSlot,
              updatedBooking.id,
              option.id
            )
          }
        ]),
        [
          {
            text: "⬅️ Назад",
            callback_data: buildCallbackData(callbackActions.back, updatedBooking.id)
          }
        ]
      ]
    }
  });

  return options;
}

export type SuggestRescheduleResult = {
  booking: Booking;
  warnings: string[];
  /**
   * The option the doctor picked was taken after the list was shown. Nothing
   * was sent to the client; the Telegram list has been refreshed instead.
   */
  slotTaken?: boolean;
};

/**
 * Sends the client other times. With `selectedOptionId` (a Telegram button)
 * only that stored option is sent, after re-checking that it is still free;
 * without it (admin panel) a fresh list is built and sent.
 */
export async function suggestReschedule(
  bookingId: string,
  selectedOptionId?: string
): Promise<SuggestRescheduleResult> {
  const warnings: string[] = [];
  const booking = await getReschedulableBooking(bookingId);
  let optionsForSms: RescheduleOption[];

  if (selectedOptionId) {
    const selectedOption = booking.rescheduleOptions?.find(
      (option) => option.id === selectedOptionId
    );

    if (!selectedOption) {
      throw new Error("Reschedule option not found");
    }

    if (!(await isOptionStillFree(booking, selectedOption))) {
      try {
        await showRescheduleOptions(booking.id);
      } catch (error) {
        warnSideEffect(warnings, "Telegram reschedule refresh failed", error);
      }

      const refreshed = (await appRepository.getBooking(booking.id)) ?? booking;
      return { booking: refreshed, warnings, slotTaken: true };
    }

    optionsForSms = [selectedOption];
  } else {
    optionsForSms = await findRescheduleOptions(booking);
  }

  const updatedBooking =
    (await appRepository.updateBooking(booking.id, {
      status: "reschedule_requested",
      rescheduleOptions: optionsForSms
    })) ?? booking;

  try {
    await enqueueSms({
      type: "booking_rescheduled",
      phone: booking.phone,
      message: rescheduleSms(optionsForSms),
      clientId: booking.clientId,
      bookingId: booking.id,
      dedupe: false
    });
  } catch (error) {
    warnSideEffect(warnings, "Reschedule SMS failed", error);
  }

  try {
    await editTelegramMessage({
      chatId: updatedBooking.telegramChatId,
      messageId: updatedBooking.telegramMessageId,
      text: rescheduleSentTelegramText(updatedBooking),
      replyMarkup: bookingActionKeyboard(updatedBooking.id)
    });
  } catch (error) {
    warnSideEffect(warnings, "Telegram reschedule update failed", error);
  }

  return { booking: updatedBooking, warnings };
}

export async function restoreBookingTelegramMessage(bookingId: string) {
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  await editTelegramMessage({
    chatId: booking.telegramChatId,
    messageId: booking.telegramMessageId,
    text: bookingRequestTelegramText(booking),
    replyMarkup: bookingActionKeyboard(booking.id)
  });

  return booking;
}
