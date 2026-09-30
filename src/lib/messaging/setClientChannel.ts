import type { Booking, MessageChannel } from "@/types/domain";
import { appRepository } from "@/lib/repositories/appRepository";

const openStatuses: Booking["status"][] = ["pending", "confirmed", "reschedule_requested"];

/**
 * Changes a client's preferred channel in one write, together with what
 * depends on it: the channel shown on their open bookings and the channel of
 * messages still waiting in the queue (sent/logged messages keep theirs).
 */
export async function setClientChannel(clientId: string, channel: MessageChannel) {
  const now = new Date().toISOString();
  let found = false;

  await appRepository.updateData((data) => {
    const clients = data.clients.map((client) => {
      if (client.id !== clientId) return client;
      found = true;
      return { ...client, preferredChannel: channel, updatedAt: now };
    });

    if (!found) {
      throw new Error("Client not found");
    }

    return {
      ...data,
      clients,
      bookings: data.bookings.map((booking) =>
        booking.clientId === clientId && openStatuses.includes(booking.status)
          ? { ...booking, preferredChannel: channel, updatedAt: now }
          : booking
      ),
      smsQueue: data.smsQueue.map((item) =>
        item.clientId === clientId && item.status === "scheduled"
          ? { ...item, channel, updatedAt: now }
          : item
      )
    };
  });
}

/** The same change started from a booking (e.g. in the booking drawer). */
export async function setBookingChannel(bookingId: string, channel: MessageChannel) {
  const booking = await appRepository.getBooking(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.clientId) {
    await setClientChannel(booking.clientId, channel);
  }

  // Also covers a booking without a client card and closed bookings.
  return appRepository.updateBooking(bookingId, { preferredChannel: channel });
}
