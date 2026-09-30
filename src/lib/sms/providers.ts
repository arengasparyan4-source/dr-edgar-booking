import { randomUUID } from "node:crypto";
import type { SmsType } from "@/types/sms";

/**
 * Adapter-based SMS provider layer.
 *
 * A provider only performs low-level delivery. Deciding *whether* it is safe to
 * dispatch (mock vs real, auto-send gate, dedup) lives in smsService — a
 * provider here is intentionally dumb.
 *
 * To add a real provider later (Team Telecom Armenia, Viva, Ucom, Twilio, …)
 * create a new class implementing SmsProvider and wire it in resolveProvider().
 * Never hardcode secrets: read them from process.env.
 */

export type SmsPayload = {
  to: string;
  message: string;
  type: SmsType;
  clientId?: string;
  bookingId?: string;
};

export type SmsSendResult =
  | { success: true; providerMessageId?: string; providerResponse?: string }
  | { success: false; error: string; providerResponse?: string };

export interface SmsProvider {
  readonly name: string;
  /**
   * True only for an adapter that really delivers SMS. While no provider can,
   * the app runs in demo mode: nothing is sent and stubs are never called.
   */
  readonly canDeliver: boolean;
  send(payload: SmsPayload): Promise<SmsSendResult>;
}

/**
 * Development / default provider. Never touches the network — it only logs the
 * message and reports success, so it is always safe to "send".
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock";
  readonly canDeliver = false;

  async send(payload: SmsPayload): Promise<SmsSendResult> {
    console.info("[MockSmsProvider] (not actually sent)", {
      to: payload.to,
      type: payload.type,
      message: payload.message
    });

    return {
      success: true,
      providerMessageId: `mock_${randomUUID()}`,
      providerResponse: "logged by mock provider (no real SMS sent)"
    };
  }
}

/**
 * Generic HTTP provider skeleton for a future real integration. It reads config
 * from the environment and refuses to send if it is not fully configured, so it
 * can never silently pretend to deliver. The actual HTTP call is intentionally
 * left unimplemented until a real provider + credentials are wired up.
 */
export class GenericHttpSmsProvider implements SmsProvider {
  readonly name = "http";
  // Skeleton only: flip to true together with a real HTTP implementation.
  readonly canDeliver = false;

  async send(payload: SmsPayload): Promise<SmsSendResult> {
    const apiUrl = process.env.SMS_API_URL;
    const apiKey = process.env.SMS_API_KEY;
    const senderId = process.env.SMS_SENDER_ID;

    if (!apiUrl || !apiKey || !senderId) {
      return {
        success: false,
        error:
          "SMS provider is not configured (SMS_API_URL / SMS_API_KEY / SMS_SENDER_ID missing)"
      };
    }

    // A real integration would perform the provider-specific HTTP request here,
    // e.g. fetch(apiUrl, { method: "POST", headers, body }). Until a concrete
    // provider is chosen we do not send anything and report a clear error.
    console.info("[GenericHttpSmsProvider] configured but no concrete provider wired", {
      to: payload.to,
      senderId,
      type: payload.type
    });

    return {
      success: false,
      error:
        "Real SMS delivery is not implemented yet. Configure a concrete provider adapter before enabling auto-send."
    };
  }
}

/**
 * Placeholder for the doctor's own SIM / GSM-modem / phone-gateway sender.
 *
 * This is the intended future path: SMS are sent FROM the doctor's SIM card
 * through a local GSM modem or a phone gateway app (e.g. an Android SMS
 * gateway), NOT through a paid API. It is intentionally NOT implemented yet —
 * it never sends and always reports a clear "not connected" error so nothing
 * can go out by accident. A real integration (serial AT commands to the modem,
 * or an HTTP call to the gateway) will be wired here manually once the hardware
 * is chosen and configured. Config is read from env placeholders only.
 */
export class GsmModemSmsProvider implements SmsProvider {
  readonly name = "gsm";
  // Not connected: flip to true together with the real modem/gateway code.
  readonly canDeliver = false;

  async send(payload: SmsPayload): Promise<SmsSendResult> {
    const port = process.env.SMS_GSM_PORT;
    const gatewayUrl = process.env.SMS_GATEWAY_URL;

    console.info("[GsmModemSmsProvider] SIM/GSM sender not connected yet — not sent", {
      to: payload.to,
      type: payload.type,
      configured: Boolean(port || gatewayUrl)
    });

    return {
      success: false,
      error:
        "SIM/GSM sender is not connected yet. Configure the GSM modem or phone gateway before enabling real sending."
    };
  }
}

export const getSmsProviderName = (): string =>
  (process.env.SMS_PROVIDER ?? "mock").trim().toLowerCase() || "mock";

export const resolveSmsProvider = (): SmsProvider => {
  const name = getSmsProviderName();

  switch (name) {
    case "mock":
      return new MockSmsProvider();
    // The doctor's SIM / GSM-modem / phone-gateway sender (future, safe skeleton).
    case "gsm":
    case "sim":
      return new GsmModemSmsProvider();
    // Future API providers plug in here, e.g.:
    // case "twilio": return new TwilioSmsProvider();
    // case "teamtelecom": return new TeamTelecomSmsProvider();
    default:
      return new GenericHttpSmsProvider();
  }
};

export const isMockProvider = () => getSmsProviderName() === "mock";

/** Demo mode: the configured provider cannot deliver real SMS. */
export const isSmsDemoMode = () => !resolveSmsProvider().canDeliver;
