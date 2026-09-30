import type { Booking } from "@/types/domain";
import { editTelegramMessage } from "@/lib/telegram/editTelegramMessage";
import {
  completedTelegramText,
  noShowTelegramText
} from "@/lib/telegram/telegramText";

/**
 * Updates the doctor's Telegram message after a visit is closed as completed
 * or no_show. No SMS goes to the client for either. Returns warnings instead
 * of throwing: the status is already saved.
 */
export async function notifyStatusChange(booking: Booking | null): Promise<string[]> {
  if (!booking || (booking.status !== "completed" && booking.status !== "no_show")) {
    return [];
  }

  try {
    await editTelegramMessage({
      chatId: booking.telegramChatId,
      messageId: booking.telegramMessageId,
      text:
        booking.status === "no_show"
          ? noShowTelegramText(booking)
          : completedTelegramText(booking),
      replyMarkup: { inline_keyboard: [] }
    });
    return [];
  } catch (error) {
    console.warn("[notifyStatusChange] Telegram update failed", {
      bookingId: booking.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return ["Telegram update failed"];
  }
}
