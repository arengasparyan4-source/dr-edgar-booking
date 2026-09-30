import { appRepository } from "./appRepository";

const bookingBelongsToClient = (
  booking: Awaited<ReturnType<typeof appRepository.listBookings>>[number],
  client: Awaited<ReturnType<typeof appRepository.getData>>["clients"][number]
) =>
  booking.clientId === client.id ||
  booking.phone === client.normalizedPhone ||
  booking.phone === client.phone;

export const bookingsRepository = {
  list: appRepository.listBookings,
  get: appRepository.getBooking,
  save: appRepository.saveBooking,
  update: appRepository.updateBooking,

  async getClientBookings(clientId: string) {
    const data = await appRepository.getData();
    const client = data.clients.find((item) => item.id === clientId);

    if (!client) {
      return [];
    }

    return data.bookings
      .filter((booking) => bookingBelongsToClient(booking, client))
      .sort((a, b) =>
        `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)
      );
  },

  updateBookingFromClientProfile: appRepository.updateBooking
};
