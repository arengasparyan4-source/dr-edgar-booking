import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const envFiles = [".env.local", ".env"];
const requiredVars = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_WEBHOOK_SECRET"
];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

for (const envFile of envFiles) {
  loadEnvFile(path.join(process.cwd(), envFile));
}

for (const key of requiredVars) {
  console.log(`${key}: ${process.env[key] ? "exists" : "missing"}`);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!token || !chatId) {
  console.error("Telegram test failed: required Telegram env variables are missing.");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: chatId,
    text:
      "✅ Telegram test from Dr. Edgar booking system.\nIf you see this message, TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are working.",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Test Confirm", callback_data: "test_confirm" },
          { text: "❌ Test Cancel", callback_data: "test_cancel" }
        ],
        [{ text: "🔁 Test Reschedule", callback_data: "test_reschedule" }]
      ]
    }
  })
});

const payload = await response.json().catch(() => null);

if (!response.ok || !payload?.ok) {
  const description =
    typeof payload?.description === "string"
      ? payload.description
      : `HTTP ${response.status}`;
  console.error(`Telegram test failed: ${description}`);
  process.exit(1);
}

console.log("Telegram test sent successfully.");
console.log("Inline buttons: included");
