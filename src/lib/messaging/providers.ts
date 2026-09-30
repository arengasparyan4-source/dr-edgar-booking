import { randomUUID } from "node:crypto";
import type { MessageChannel } from "@/types/domain";
import type { SmsType } from "@/types/sms";
import { getSmsProviderName, isMockProvider, resolveSmsProvider } from "@/lib/sms/providers";
import { MESSAGE_CHANNELS } from "./channels";

/**
 * One interface for every message channel, and a registry that picks the
 * provider for a channel. SMS keeps its existing adapters (mock / gsm / http).
 * WhatsApp, Viber and Telegram have demo providers only: they write the
 * message to the server log and never contact any service. Connecting a real
 * one later means implementing MessageProvider and returning it from
 * getChannelProvider - nothing else has to change.
 */

export type MessagePayload = {
  to: string;
  message: string;
  type: SmsType;
  clientId?: string;
  bookingId?: string;
};

export type MessageSendResult =
  | { success: true; providerMessageId?: string; providerResponse?: string }
  | { success: false; error: string; providerResponse?: string };

export interface MessageProvider {
  readonly channel: MessageChannel;
  readonly name: string;
  /** True only when the provider really delivers messages. */
  readonly canDeliver: boolean;
  /**
   * True for providers that only write to the log (mock SMS, demo channels).
   * They are always safe to "send" through, so the queue does not pile up.
   */
  readonly logOnly: boolean;
  send(payload: MessagePayload): Promise<MessageSendResult>;
}

export class DemoChannelProvider implements MessageProvider {
  readonly canDeliver = false;
  readonly logOnly = true;
  readonly name: string;

  constructor(readonly channel: MessageChannel) {
    this.name = `${channel}-demo`;
  }

  async send(payload: MessagePayload): Promise<MessageSendResult> {
    console.info(`[DemoChannelProvider:${this.channel}] (not actually sent)`, {
      to: payload.to,
      type: payload.type,
      message: payload.message
    });

    return {
      success: true,
      providerMessageId: `demo_${randomUUID()}`,
      providerResponse: `demo: ${this.channel} is not connected, message only logged`
    };
  }
}

const smsProvider = (): MessageProvider => {
  const provider = resolveSmsProvider();
  return {
    channel: "sms",
    name: provider.name,
    canDeliver: provider.canDeliver,
    logOnly: isMockProvider(),
    send: (payload) => provider.send(payload)
  };
};

export function getChannelProvider(channel: MessageChannel): MessageProvider {
  return channel === "sms" ? smsProvider() : new DemoChannelProvider(channel);
}

export type ChannelStatus = {
  channel: MessageChannel;
  provider: string;
  /** A real provider is connected and can deliver. */
  connected: boolean;
};

/** What the admin shows per channel. */
export const channelStatuses = (): ChannelStatus[] =>
  MESSAGE_CHANNELS.map((channel) => {
    const provider = getChannelProvider(channel);
    return {
      channel,
      provider: channel === "sms" ? getSmsProviderName() : provider.name,
      connected: provider.canDeliver
    };
  });
