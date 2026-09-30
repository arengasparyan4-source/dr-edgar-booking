import type { Language } from "@/data/translations";
import type { MessageChannel } from "@/types/domain";

/**
 * SMS domain types for the Dr. Edgar CRM.
 *
 * The system is queue + log based:
 *  - templates define reusable message bodies with {{variables}}
 *  - queue items represent messages that are scheduled / sent / failed
 *  - logs are an append-only archive of every dispatch attempt
 *
 * Real sending is adapter-based (see src/lib/sms/providers.ts) and is only
 * performed when it is explicitly safe to do so (mock provider, or a real
 * provider with auto-send enabled). See src/lib/sms/smsService.ts.
 */

export type SmsType =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancelled"
  | "booking_rescheduled"
  | "birthday"
  | "loyalty"
  | "custom";

export type SmsStatus = "scheduled" | "sent" | "failed" | "cancelled" | "skipped";

/** Variables that can be interpolated into a template body via {{name}}. */
export type SmsTemplateVariables = {
  clientName: string;
  phone: string;
  date: string;
  time: string;
  services: string;
  doctorName: string;
  clinicName: string;
  discount: string;
  customMessage: string;
};

export type SmsTemplate = {
  id: string;
  type: SmsType;
  name: string;
  language: Language;
  body: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SmsQueueItem = {
  id: string;
  type: SmsType;
  /** Channel the message goes out through; "sms" for items created before channels. */
  channel?: MessageChannel;
  clientId?: string;
  bookingId?: string;
  phone: string;
  message: string;
  scheduledAt: string;
  status: SmsStatus;
  attempts: number;
  lastError?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

export type SmsLog = {
  id: string;
  queueItemId?: string;
  type: SmsType;
  channel?: MessageChannel;
  clientId?: string;
  bookingId?: string;
  phone: string;
  message: string;
  status: SmsStatus;
  provider: string;
  providerResponse?: string;
  error?: string;
  createdAt: string;
};
