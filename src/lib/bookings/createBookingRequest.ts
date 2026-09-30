import { randomUUID } from "node:crypto";
import type { Booking, MessageChannel, TimeSlot } from "@/types/domain";
import {
  assertSlotAvailableInData,
  fetchGoogleBusy
} from "@/lib/availability/getAvailability";
import { addDays } from "@/lib/availability/time";
import {
  assertDateInWindow,
  getPublicBookingWindow
} from "@/lib/availability/bookingWindow";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import { appRepository } from "@/lib/repositories/appRepository";
import { enqueueSms } from "@/lib/sms/smsService";
import { sendBookingRequestMessage } from "@/lib/telegram/sendBookingRequestMessage";
import { pendingSmsHy } from "./messages";
import { sideEffectWarner } from "./sideEffects";

export type CreateBookingRequestInput = {
  firstName: string;
  lastName: string;
  phone: string;
  selectedServiceIds: string[];
  selectedSlot: TimeSlot;
  comment?: string;
  preferredChannel?: MessageChannel;
};

export type CreateBookingRequestResult = {
  booking: Booking;
  warnings: string[];
};

const warnSideEffect = sideEffectWarner("[createBookingRequest]");

export async function createBookingRequest(
  input: CreateBookingRequestInput
): Promise<CreateBookingRequestResult> {
  const { settings } = await appRepository.getData();
  const window = getPublicBookingWindow(settings);
  assertDateInWindow(input.selectedSlot.date, window);
  const slot = input.selectedSlot;
  // Network call, so before the lock; bookings are re-read inside it.
  const googleBusy = await fetchGoogleBusy(settings, slot.date, addDays(slot.date, 1));
  const now = new Date().toISOString();
  const warnings: string[] = [];
  const bookingId = `booking_${randomUUID()}`;
  let booking!: Booking;

  // Check and save in one write on the freshest data: of two simultaneous
  // requests for one slot exactly one gets it, the other gets SLOT_TAKEN.
  await appRepository.updateData((data) => {
    const availability = assertSlotAvailableInData(data, googleBusy, {
      selectedServiceIds: input.selectedServiceIds,
      slot,
      notBefore: window.notBefore
    });

    booking = {
      id: bookingId,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      selectedServiceIds: input.selectedServiceIds,
      servicesSnapshot: availability.services,
      totalDurationMinutes: availability.totalDurationMinutes,
      totalPrice: availability.totalPrice,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      comment: input.comment,
      preferredChannel: input.preferredChannel,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    return { ...data, bookings: [booking, ...data.bookings] };
  });

  let savedBooking = booking;

  // The client card is linked after the slot is secured, so a request that
  // lost the race leaves no client record behind.
  try {
    const fullName = `${input.firstName} ${input.lastName}`.trim();
    const result = await clientsRepository.upsertClientByPhone({
      fullName,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      normalizedPhone: input.phone,
      comment: input.comment || undefined,
      status: "new",
      isVip: false,
      isBlacklisted: false,
      source: "booking",
      nextBookingDate: slot.date,
      preferredChannel: input.preferredChannel
    });
    // The booking keeps the channel the client ends up with (their earlier
    // choice when none was made now).
    const linked = {
      clientId: result.client.id,
      preferredChannel: result.client.preferredChannel ?? "sms"
    } as const;
    savedBooking =
      (await appRepository.updateBooking(booking.id, linked)) ?? {
        ...savedBooking,
        ...linked
      };
  } catch (error) {
    warnSideEffect(warnings, "Client upsert from booking failed", error, { bookingId: bookingId });
  }

  try {
    const telegram = await sendBookingRequestMessage(savedBooking);

    try {
      savedBooking =
        (await appRepository.updateBooking(booking.id, {
          telegramChatId: telegram.chatId,
          telegramMessageId: telegram.messageId
        })) ?? savedBooking;
    } catch (error) {
      warnSideEffect(warnings, "Telegram metadata update failed", error, { bookingId: booking.id });
    }
  } catch (error) {
    warnSideEffect(warnings, "Telegram booking notification failed", error, { bookingId: booking.id });
  }

  try {
    await enqueueSms({
      type: "custom",
      channel: savedBooking.preferredChannel,
      phone: input.phone,
      message: pendingSmsHy,
      clientId: savedBooking.clientId,
      bookingId: savedBooking.id,
      dedupe: false
    });
  } catch (error) {
    warnSideEffect(warnings, "Pending SMS failed", error, { bookingId: booking.id });
  }

  return { booking: savedBooking, warnings };
}
