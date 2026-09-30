import type { Booking } from "@/types/domain";
import { buildCallbackData, callbackActions } from "./callbackData";
import { bookingRequestTelegramText } from "./telegramText";

const getTelegramConfig = () => ({
  token: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID
});

type TelegramSendMessageResponse = {
  ok?: boolean;
  result?: { message_id?: number; chat?: { id?: number | string } };
  error_code?: number;
  description?: string;
  parameters?: { migrate_to_chat_id?: number | string };
};

export const bookingActionKeyboard = (bookingId: string) => ({
  inline_keyboard: [
    [
      {
        text: "✅ Подтвердить",
        callback_data: buildCallbackData(callbackActions.confirm, bookingId)
      },
      {
        text: "❌ Отменить",
        callback_data: buildCallbackData(callbackActions.cancel, bookingId)
      }
    ],
    [
      {
        text: "🔁 Предложить другое время",
        callback_data: buildCallbackData(callbackActions.reschedule, bookingId)
      }
    ]
  ]
});

export async function sendBookingRequestMessage(booking: Booking) {
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    console.info("[MockTelegram] sendBookingRequestMessage", {
      text: bookingRequestTelegramText(booking),
      reply_markup: bookingActionKeyboard(booking.id)
    });
    return { chatId: chatId || "mock", messageId: `mock_${booking.id}` };
  }

  const sendMessage = async (
    targetChatId: string,
    allowMigrationRetry = true
  ): Promise<{ chatId: string; data: TelegramSendMessageResponse }> => {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: bookingRequestTelegramText(booking),
          reply_markup: bookingActionKeyboard(booking.id)
        })
      }
    );

    const data = (await response.json().catch(
      () => ({})
    )) as TelegramSendMessageResponse;
    const migratedChatId = data.parameters?.migrate_to_chat_id;

    if (!response.ok || data.ok === false) {
      if (allowMigrationRetry && migratedChatId) {
        console.warn("[Telegram] Chat migrated; retrying sendMessage");
        return sendMessage(String(migratedChatId), false);
      }

      throw new Error(
        `Telegram sendMessage failed: ${
          data.description || response.statusText || "Unknown Telegram error"
        }`
      );
    }

    return { chatId: targetChatId, data };
  };

  const { chatId: sentChatId, data } = await sendMessage(chatId);

  return {
    chatId: String(data.result?.chat?.id ?? sentChatId),
    messageId: String(data.result?.message_id ?? "")
  };
}
