import { createHash } from "node:crypto";
import type { Booking, PublicBookingConfirmation } from "@/types/domain";

/**
 * Crockford-style alphabet: 32 symbols with 0/O/1/I left out so a code read out
 * over the phone cannot be mistyped. 32 divides 256, so taking digest bytes
 * modulo the length stays uniform.
 */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const REFERENCE_LENGTH = 6;

/**
 * A short, stable, public reference for a booking.
 *
 * Derived from the internal id by hashing rather than by truncating it, so the
 * code reveals nothing about the id itself. Being deterministic, the same code
 * can be recomputed later to match a client's enquiry against a booking.
 */
export function publicBookingReference(bookingId: string): string {
  const digest = createHash("sha256").update(bookingId, "utf8").digest();
  let reference = "";

  for (let index = 0; index < REFERENCE_LENGTH; index += 1) {
    reference += REFERENCE_ALPHABET[digest[index] % REFERENCE_ALPHABET.length];
  }

  return reference;
}

export function toPublicBookingConfirmation(booking: Booking): PublicBookingConfirmation {
  return {
    reference: publicBookingReference(booking.id),
    status: booking.status,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    services: booking.servicesSnapshot.map((service) => service.name)
  };
}
