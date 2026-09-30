import { randomUUID } from "node:crypto";
import {
  assertSlotAvailableInData,
  assertSlotIsAvailable,
  fetchGoogleBusyForSlot
} from "@/lib/availability/getAvailability";
import { earliestStartFromNow } from "@/lib/availability/bookingWindow";
import { splitClientFullName } from "@/lib/clients/clientImport";
import { manualBookingSchema } from "@/lib/clients/clientSchemas";
import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import { appRepository } from "@/lib/repositories/appRepository";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import type { Booking } from "@/types/domain";
import { confirmBooking } from "./confirmBooking";

export async function createManualBooking(input: unknown) {
  const values = manualBookingSchema.parse(input);
  const normalizedPhone = normalizePhoneNumber(values.phone);

  if (!normalizedPhone) {
    throw new Error("Invalid phone");
  }

  const slot = {
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime
  };
  const slotCheck = {
    selectedServiceIds: values.selectedServiceIds,
    slot,
    // The doctor is not bound by the public notice or horizon, only by "not
    // in the past".
    notBefore: earliestStartFromNow(0)
  };
  // Fail fast before touching the client card; the binding check is below.
  await assertSlotIsAvailable(slotCheck);
  const googleBusy = await fetchGoogleBusyForSlot(slot);
  const splitName = splitClientFullName(values.fullName);
  const { client } = await clientsRepository.upsertClientByPhone({
    fullName: values.fullName,
    ...splitName,
    phone: values.phone,
    normalizedPhone,
    status: "active",
    isVip: false,
    isBlacklisted: false,
    source: "manual",
    nextBookingDate: values.date,
    preferredChannel: values.preferredChannel
  });
  const now = new Date().toISOString();
  let booking!: Booking;

  // Re-check and save atomically on fresh data (bug #3).
  await appRepository.updateData((data) => {
    const availability = assertSlotAvailableInData(data, googleBusy, slotCheck);

    booking = {
      id: `booking_${randomUUID()}`,
      clientId: client.id,
      firstName: splitName.firstName ?? values.fullName,
      lastName: splitName.lastName ?? "",
      phone: normalizedPhone,
      selectedServiceIds: values.selectedServiceIds,
      servicesSnapshot: availability.services,
      totalDurationMinutes: availability.totalDurationMinutes,
      totalPrice: availability.totalPrice,
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      comment: values.comment || undefined,
      preferredChannel: client.preferredChannel ?? "sms",
      status: "pending",
      createdAt: now,
      updatedAt: now
    };

    return { ...data, bookings: [booking, ...data.bookings] };
  });

  if (values.status === "confirmed") {
    return (await confirmBooking(booking.id)).booking;
  }

  return booking;
}
