export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.info("[MockTelegram] answerCallbackQuery", { callbackQueryId, text });
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: Boolean(text)
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram answerCallbackQuery failed: ${await response.text()}`);
  }
}
