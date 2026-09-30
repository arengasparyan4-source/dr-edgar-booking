import { type NextRequest, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/bookings/cancelBooking";
import { confirmBooking } from "@/lib/bookings/confirmBooking";
import {
  restoreBookingTelegramMessage,
  showRescheduleOptions,
  suggestReschedule
} from "@/lib/bookings/suggestReschedule";
import { answerCallbackQuery } from "@/lib/telegram/answerCallbackQuery";
import {
  callbackActions,
  parseCallbackData
} from "@/lib/telegram/callbackData";
import { timingSafeEqualStrings } from "@/lib/security/timingSafeCompare";

type TelegramWebhookBody = {
  callback_query?: {
    id: string;
    data?: string;
  };
};

// Doctor-facing text for errors the doctor can act on; anything else is
// reported generically (details stay in the server log).
const doctorErrorText: Record<string, string> = {
  "Booking not found": "Запись не найдена",
  "Reschedule option not found":
    "Этот вариант устарел. Нажмите «Предложить другое время» ещё раз",
  "Booking date/time cannot be changed from current status":
    "Запись уже отменена или завершена",
  "Booking cannot be confirmed from current status":
    "Запись нельзя подтвердить в текущем статусе",
  "Booking status transition not allowed":
    "Запись уже отменена или завершена",
  "Slot is taken": "Это время уже занято",
  "Selected slot is no longer available": "Это время уже недоступно"
};

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

export async function POST(request: NextRequest) {
  const configuredSecret = (process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

  // Fail closed. Previously a missing secret skipped the check entirely, which
  // left booking confirm/cancel/reschedule callable by anyone who could reach
  // this route.
  if (!configuredSecret) {
    console.error(
      "[telegram/webhook] TELEGRAM_WEBHOOK_SECRET is not configured - rejecting the callback. " +
        "Set it in the environment and pass the same value as secret_token to Telegram setWebhook."
    );
    return unauthorized();
  }

  if (!receivedSecret || !timingSafeEqualStrings(receivedSecret, configuredSecret)) {
    console.warn("[telegram/webhook] Rejected a callback with a missing or invalid secret token");
    return unauthorized();
  }

  const body = (await request.json()) as TelegramWebhookBody;
  const callbackQuery = body.callback_query;

  if (!callbackQuery?.id || !callbackQuery.data) {
    return NextResponse.json({ success: true });
  }

  try {
    const { action, bookingId, optionId } = parseCallbackData(callbackQuery.data);

    if (action === callbackActions.confirm) {
      await confirmBooking(bookingId);
      await answerCallbackQuery(callbackQuery.id, "Запись подтверждена");
    } else if (action === callbackActions.cancel) {
      await cancelBooking(bookingId);
      await answerCallbackQuery(callbackQuery.id, "Запись отменена");
    } else if (action === callbackActions.reschedule) {
      await showRescheduleOptions(bookingId);
      await answerCallbackQuery(callbackQuery.id, "Выберите время");
    } else if (
      action === callbackActions.offerSlot ||
      action === callbackActions.legacyOfferSlot
    ) {
      if (!optionId) {
        throw new Error("Invalid callback data");
      }

      const result = await suggestReschedule(bookingId, optionId);
      await answerCallbackQuery(
        callbackQuery.id,
        result.slotTaken
          ? "Это время уже занято. Список вариантов обновлён — выберите другое"
          : "Вариант отправлен клиенту"
      );
    } else if (action === callbackActions.back) {
      await restoreBookingTelegramMessage(bookingId);
      await answerCallbackQuery(callbackQuery.id);
    } else {
      throw new Error("Unsupported callback action");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    await answerCallbackQuery(
      callbackQuery.id,
      doctorErrorText[message] ?? "Ошибка. Попробуйте ещё раз"
    );

    return NextResponse.json(
      { success: false, message: "Telegram callback failed" },
      { status: 500 }
    );
  }
}
