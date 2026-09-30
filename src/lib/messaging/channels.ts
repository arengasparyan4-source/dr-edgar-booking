import type { MessageChannel } from "@/types/domain";

/** Every channel a client can choose, in display order. SMS is the default. */
export const MESSAGE_CHANNELS: MessageChannel[] = ["sms", "whatsapp", "viber", "telegram"];

export const DEFAULT_MESSAGE_CHANNEL: MessageChannel = "sms";

export const isMessageChannel = (value: unknown): value is MessageChannel =>
  typeof value === "string" && (MESSAGE_CHANNELS as string[]).includes(value);

/** The channel to use for a client/booking/message; "sms" when none is set. */
export const channelOf = (item: { preferredChannel?: MessageChannel } | null | undefined) =>
  item?.preferredChannel ?? DEFAULT_MESSAGE_CHANNEL;

/** Brand names are not translated. */
export const CHANNEL_LABELS: Record<MessageChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  viber: "Viber",
  telegram: "Telegram"
};
