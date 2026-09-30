type EditTelegramMessageInput = {
  chatId?: string;
  messageId?: string;
  text: string;
  replyMarkup?: unknown;
};

export async function editTelegramMessage({
  chatId,
  messageId,
  text,
  replyMarkup
}: EditTelegramMessageInput) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId || !messageId || messageId.startsWith("mock_")) {
    console.info("[MockTelegram] editTelegramMessage", {
      chatId,
      messageId,
      text,
      reply_markup: replyMarkup
    });
    return;
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: Number(messageId),
      text,
      reply_markup: replyMarkup
    })
  });

  if (!response.ok) {
    throw new Error(`Telegram editMessageText failed: ${await response.text()}`);
  }
}
