import type { Booking, BookingStatus, TimeSlot } from "@/types/domain";

// The doctor's chat is bilingual (hy / ru), like the header line below.
const statusLabels: Record<BookingStatus, string> = {
  pending: "Սպասում է / Ожидает",
  confirmed: "Հաստատված / Подтверждена",
  cancelled: "Չեղարկված / Отменена",
  reschedule_requested: "Այլ ժամ / Перенос",
  completed: "Ավարտված / Завершена",
  no_show: "Չներկայացավ / Не пришёл"
};

export const telegramStatusLabel = (status: BookingStatus) =>
  statusLabels[status] ?? status;

const formatPrice = (value: number) => new Intl.NumberFormat("hy-AM").format(value);

export const bookingRequestTelegramText = (booking: Booking) =>
  [
    "🆕 Նոր գրանցման հայտ / Новая заявка",
    "",
    `👤 Клиент: ${booking.firstName} ${booking.lastName}`,
    `📞 Телефон: ${booking.phone}`,
    "",
    "💉 Процедуры:",
    ...booking.servicesSnapshot.map(
      (service) =>
        `- ${service.name.hy} / ${service.name.ru} - ${service.durationMinutes} мин - ${formatPrice(service.price)} AMD`
    ),
    "",
    `⏱ Общая длительность: ${booking.totalDurationMinutes} мин`,
    `💰 Общая стоимость: ${formatPrice(booking.totalPrice)} AMD`,
    "",
    `📅 Дата: ${booking.date}`,
    `⏰ Время: ${booking.startTime} - ${booking.endTime}`,
    "",
    "📍 Адрес: Երևան, Սայաթ-Նովա 33",
    "",
    `💬 Комментарий: ${booking.comment || "Нет"}`,
    "",
    `📌 Статус: ${telegramStatusLabel(booking.status)}`
  ].join("\n");

export const confirmedTelegramText = (booking: Booking) =>
  `${bookingRequestTelegramText(booking)}\n\n✅ Запись подтверждена`;

export const cancelledTelegramText = (booking: Booking) =>
  `${bookingRequestTelegramText(booking)}\n\n❌ Запись отменена`;

export const rescheduleTelegramText = (booking: Booking, slots: TimeSlot[]) =>
  [
    bookingRequestTelegramText(booking),
    "",
    "🔁 Выберите варианты другого времени для клиента:",
    ...slots.map(
      (slot, index) =>
        `${index + 1}. ${slot.date} ${slot.startTime}-${slot.endTime}`
    )
  ].join("\n");

export const rescheduleSentTelegramText = (booking: Booking) =>
  `${bookingRequestTelegramText(booking)}\n\n🔁 Клиенту отправлены варианты другого времени`;

export const completedTelegramText = (booking: Booking) =>
  `${bookingRequestTelegramText(booking)}

✔️ Визит завершён`;

export const noShowTelegramText = (booking: Booking) =>
  `${bookingRequestTelegramText(booking)}

🚫 Клиент не пришёл`;
