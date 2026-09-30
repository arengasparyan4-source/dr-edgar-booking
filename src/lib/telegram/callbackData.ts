/**
 * Telegram limits `callback_data` to 64 bytes; a longer value makes Telegram
 * reject the whole message edit. Booking ids are `booking_<uuid>` (44 bytes),
 * so actions and arguments must stay short.
 */
export const TELEGRAM_CALLBACK_DATA_MAX_BYTES = 64;

export const callbackActions = {
  confirm: "booking_confirm",
  cancel: "booking_cancel",
  reschedule: "booking_reschedule",
  /** Doctor picked one of the stored reschedule options. */
  offerSlot: "booking_slot",
  /** Pre-fix spelling; kept so buttons sent before the fix still resolve. */
  legacyOfferSlot: "booking_offer_slot",
  back: "booking_back"
} as const;

export function buildCallbackData(...parts: string[]): string {
  const data = parts.join(":");
  const size = Buffer.byteLength(data, "utf8");

  if (size > TELEGRAM_CALLBACK_DATA_MAX_BYTES) {
    throw new Error(
      `Telegram callback_data is ${size} bytes, limit is ${TELEGRAM_CALLBACK_DATA_MAX_BYTES}`
    );
  }

  return data;
}

export function parseCallbackData(data: string) {
  const [action, bookingId, optionId] = data.split(":");

  if (!action?.startsWith("booking_") || !bookingId) {
    throw new Error("Invalid callback data");
  }

  return { action, bookingId, optionId };
}
