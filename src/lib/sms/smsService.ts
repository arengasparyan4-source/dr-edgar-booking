import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import { appRepository } from "@/lib/repositories/appRepository";
import { smsRepository } from "@/lib/repositories/smsRepository";
import {
  getSmsProviderName,
  isMockProvider,
  isSmsDemoMode
} from "@/lib/sms/providers";
import { DEFAULT_MESSAGE_CHANNEL, channelOf } from "@/lib/messaging/channels";
import { channelStatuses, getChannelProvider } from "@/lib/messaging/providers";
import { addDays } from "@/lib/availability/time";
import { clinicToUtc, clinicToday } from "@/lib/time/clinicTime";
import {
  DEFAULT_CLINIC_NAME,
  DEFAULT_DOCTOR_NAME,
  renderTemplateBody
} from "@/lib/sms/templates";
import { getLocalizedServiceName } from "@/lib/services/serviceName";
import type {
  Booking,
  Client,
  MessageChannel,
  Settings
} from "@/types/domain";
import type {
  SmsQueueItem,
  SmsTemplateVariables,
  SmsType
} from "@/types/sms";

const nowIso = () => new Date().toISOString();

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Clinic wall-clock time at which reminders go out. */
const REMINDER_TIME = "09:00";

/** Types that must never be sent twice for the same booking. */
const dedupeTypes = new Set<SmsType>([
  "booking_confirmation",
  "booking_reminder",
  "booking_cancelled",
  "birthday"
]);

const isAutoSendEnvEnabled = () => process.env.SMS_AUTO_SEND_ENABLED === "true";

/**
 * The hard safety gate. The mock provider never touches the network, so it is
 * always safe to "dispatch" (it only logs). Any other provider is used only
 * when it can really deliver (not demo mode) AND both the environment flag
 * and the admin setting are enabled. In demo mode a stub (gsm/http) is never
 * called, so it cannot produce failed items with provider errors.
 */
export const isDispatchAllowed = (
  settings: Settings,
  channel: MessageChannel = DEFAULT_MESSAGE_CHANNEL
): boolean => {
  const provider = getChannelProvider(channel);
  // Log-only providers (mock SMS, demo WhatsApp/Viber/Telegram) never reach
  // anyone, so "sending" through them is always safe.
  return (
    provider.logOnly ||
    (provider.canDeliver &&
      isAutoSendEnvEnabled() &&
      settings.smsAutoSendEnabled === true)
  );
};

const isDue = (scheduledAt: string) => scheduledAt <= nowIso();

const shouldDispatchNow = (
  type: SmsType,
  scheduledAt: string,
  settings: Settings,
  channel: MessageChannel
): boolean => {
  if (!isDispatchAllowed(settings, channel) || !isDue(scheduledAt)) {
    return false;
  }

  if (type === "booking_reminder") {
    return settings.smsReminderEnabled !== false;
  }

  if (type === "birthday") {
    return settings.smsBirthdayAutoSendEnabled === true;
  }

  // Transactional (confirmation/cancel/reschedule) and explicit manual sends.
  return true;
};

export type EnqueueInput = {
  type: SmsType;
  /** The client's preferred channel; "sms" when not given. */
  channel?: MessageChannel;
  phone: string;
  message: string;
  clientId?: string;
  bookingId?: string;
  scheduledAt?: string;
  dedupe?: boolean;
};

export type EnqueueResult = {
  status: "dispatched" | "scheduled" | "duplicate" | "skipped";
  item?: SmsQueueItem;
  reason?: string;
};

/**
 * Dispatch a single scheduled/failed queue item through the provider and record
 * the outcome in both the queue item and the append-only log. Never throws:
 * delivery failures are captured as a failed status.
 */
export async function dispatchQueueItem(id: string): Promise<SmsQueueItem | null> {
  const item = await smsRepository.getQueueItem(id);

  if (!item) {
    return null;
  }

  if (item.status !== "scheduled" && item.status !== "failed") {
    return item;
  }

  const channel = item.channel ?? DEFAULT_MESSAGE_CHANNEL;
  const provider = getChannelProvider(channel);

  let result;
  try {
    result = await provider.send({
      to: item.phone,
      message: item.message,
      type: item.type,
      clientId: item.clientId,
      bookingId: item.bookingId
    });
  } catch (error) {
    result = {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown provider error"
    };
  }

  if (result.success) {
    const updated = await smsRepository.updateQueueItem(id, {
      status: "sent",
      sentAt: nowIso(),
      attempts: item.attempts + 1,
      providerMessageId: result.providerMessageId,
      lastError: undefined
    });

    await smsRepository.appendLog({
      queueItemId: id,
      type: item.type,
      channel,
      clientId: item.clientId,
      bookingId: item.bookingId,
      phone: item.phone,
      message: item.message,
      status: "sent",
      provider: provider.name,
      providerResponse: result.providerResponse
    });

    return updated;
  }

  const updated = await smsRepository.updateQueueItem(id, {
    status: "failed",
    attempts: item.attempts + 1,
    lastError: result.error
  });

  await smsRepository.appendLog({
    queueItemId: id,
    type: item.type,
    channel,
    clientId: item.clientId,
    bookingId: item.bookingId,
    phone: item.phone,
    message: item.message,
    status: "failed",
    provider: provider.name,
    providerResponse: result.providerResponse,
    error: result.error
  });

  return updated;
}

/**
 * Validate + dedupe + create a queue item, then dispatch immediately when it is
 * both due and safe/allowed. Invalid or empty phone numbers are never sent —
 * they are recorded as a skipped log entry instead.
 */
export async function enqueueSms(
  input: EnqueueInput,
  settings?: Settings
): Promise<EnqueueResult> {
  const resolvedSettings =
    settings ?? (await appRepository.getData()).settings;
  const channel = input.channel ?? DEFAULT_MESSAGE_CHANNEL;
  const normalizedPhone = normalizePhoneNumber(input.phone ?? "");

  if (!normalizedPhone) {
    await smsRepository.appendLog({
      type: input.type,
      channel,
      clientId: input.clientId,
      bookingId: input.bookingId,
      phone: input.phone ?? "",
      message: input.message,
      status: "skipped",
      provider: getChannelProvider(channel).name,
      error: "Invalid or empty phone number"
    });

    return { status: "skipped", reason: "invalid_phone" };
  }

  const dedupe = input.dedupe ?? dedupeTypes.has(input.type);

  if (dedupe && input.bookingId) {
    const queue = await smsRepository.listQueue();
    const existing = queue.find(
      (item) =>
        item.bookingId === input.bookingId &&
        item.type === input.type &&
        (item.status === "scheduled" || item.status === "sent")
    );

    if (existing) {
      return { status: "duplicate", item: existing };
    }
  }

  const scheduledAt = input.scheduledAt ?? nowIso();
  const item = await smsRepository.createQueueItem({
    type: input.type,
    channel,
    clientId: input.clientId,
    bookingId: input.bookingId,
    phone: normalizedPhone,
    message: input.message,
    scheduledAt,
    status: "scheduled",
    attempts: 0
  });

  if (shouldDispatchNow(input.type, scheduledAt, resolvedSettings, channel)) {
    const dispatched = await dispatchQueueItem(item.id);
    return { status: "dispatched", item: dispatched ?? item };
  }

  return { status: "scheduled", item };
}

// ---------------------------------------------------------------------------
// Template rendering helpers
// ---------------------------------------------------------------------------

const getClientForBooking = (
  booking: Booking,
  clients: Client[]
): Client | undefined => {
  if (booking.clientId) {
    const byId = clients.find((client) => client.id === booking.clientId);
    if (byId) {
      return byId;
    }
  }

  return clients.find(
    (client) =>
      client.normalizedPhone === booking.phone || client.phone === booking.phone
  );
};

export const buildBookingVariables = (
  booking: Booking,
  client: Client | undefined,
  extra: Partial<SmsTemplateVariables> = {}
): SmsTemplateVariables => {
  const services = booking.servicesSnapshot
    .map((service) => getLocalizedServiceName(service, "hy"))
    .filter(Boolean)
    .join(", ");
  const clientName =
    client?.fullName ||
    `${booking.firstName ?? ""} ${booking.lastName ?? ""}`.trim();

  return {
    clientName,
    phone: booking.phone,
    date: booking.date,
    time: booking.startTime,
    services,
    doctorName: DEFAULT_DOCTOR_NAME,
    clinicName: DEFAULT_CLINIC_NAME,
    discount: "",
    customMessage: "",
    ...extra
  };
};

/**
 * Render a message for a type using the (enabled) template if present, with a
 * safe fallback so a missing/disabled template never blocks a booking action.
 */
export async function renderMessageForType(
  type: SmsType,
  variables: Partial<SmsTemplateVariables>
): Promise<string> {
  const templates = await smsRepository.listTemplates();
  const template =
    templates.find((item) => item.type === type && item.enabled) ??
    templates.find((item) => item.type === type);

  if (template) {
    return renderTemplateBody(template.body, variables);
  }

  const date = variables.date ?? "";
  const time = variables.time ?? "";

  switch (type) {
    case "booking_confirmation":
      return `Ձեր գրանցումը հաստատված է ${date} ${time}:`.trim();
    case "booking_reminder":
      return `Հիշեցում՝ գրանցում ${date} ${time}:`.trim();
    case "booking_cancelled":
      return "Ձեր գրանցումը չեղարկվել է:";
    case "booking_rescheduled":
      return `Ձեր գրանցումը տեղափոխվել է ${date} ${time}:`.trim();
    default:
      return variables.customMessage ?? "";
  }
}

// ---------------------------------------------------------------------------
// Booking-flow integration
// ---------------------------------------------------------------------------

/**
 * Enqueue (and dispatch when allowed) a transactional SMS for a booking. Used
 * by confirm/cancel/reschedule flows. Safe to call from within those flows —
 * it never throws.
 */
export async function dispatchBookingSms(params: {
  booking: Booking;
  type: SmsType;
  message?: string;
  extraVariables?: Partial<SmsTemplateVariables>;
  dedupe?: boolean;
}): Promise<EnqueueResult> {
  try {
    const data = await appRepository.getData();
    const client = getClientForBooking(params.booking, data.clients);
    const variables = buildBookingVariables(
      params.booking,
      client,
      params.extraVariables
    );
    const message =
      params.message ?? (await renderMessageForType(params.type, variables));

    return await enqueueSms(
      {
        type: params.type,
        channel: client ? channelOf(client) : channelOf(params.booking),
        phone: params.booking.phone,
        message,
        clientId: client?.id ?? params.booking.clientId,
        bookingId: params.booking.id,
        dedupe: params.dedupe
      },
      data.settings
    );
  } catch (error) {
    console.warn("[smsService] dispatchBookingSms failed", {
      bookingId: params.booking.id,
      type: params.type,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return { status: "skipped", reason: "error" };
  }
}

/**
 * Reminder instant as UTC ISO: 09:00 clinic time, `offsetDays` before the
 * visit. (It used to be a zone-less local string compared with UTC "now",
 * which shifted reminders by the zone offset - bug #11.)
 */
const reminderDateTime = (bookingDate: string, offsetDays: number): string | null => {
  if (!isoDatePattern.test(bookingDate)) {
    return null;
  }

  return clinicToUtc(addDays(bookingDate, -offsetDays), REMINDER_TIME).toISOString();
};

/**
 * Create scheduled reminder queue items for a confirmed booking (one per
 * configured offset). Idempotent via dedupe; past-dated reminders are skipped.
 */
export async function scheduleBookingReminders(booking: Booking): Promise<void> {
  try {
    const data = await appRepository.getData();
    const settings = data.settings;

    if (settings.smsReminderEnabled === false) {
      return;
    }

    if (booking.status !== "confirmed") {
      return;
    }

    const offsets =
      settings.smsReminderOffsets && settings.smsReminderOffsets.length > 0
        ? settings.smsReminderOffsets
        : [1];
    const client = getClientForBooking(booking, data.clients);

    for (const offset of offsets) {
      const scheduledAt = reminderDateTime(booking.date, offset);

      if (!scheduledAt || scheduledAt < nowIso()) {
        continue;
      }

      const message = await renderMessageForType(
        "booking_reminder",
        buildBookingVariables(booking, client)
      );

      await enqueueSms(
        {
          type: "booking_reminder",
          channel: client ? channelOf(client) : channelOf(booking),
          phone: booking.phone,
          message,
          clientId: client?.id ?? booking.clientId,
          bookingId: booking.id,
          scheduledAt,
          dedupe: true
        },
        settings
      );
    }
  } catch (error) {
    console.warn("[smsService] scheduleBookingReminders failed", {
      bookingId: booking.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/** Cancel still-scheduled queue items for a booking (e.g. after cancel/reschedule). */
export async function cancelBookingScheduledSms(
  bookingId: string,
  types?: SmsType[]
): Promise<number> {
  const queue = await smsRepository.listQueue();
  const toCancel = queue.filter(
    (item) =>
      item.bookingId === bookingId &&
      item.status === "scheduled" &&
      (!types || types.includes(item.type))
  );

  for (const item of toCancel) {
    await smsRepository.updateQueueItem(item.id, { status: "cancelled" });
    await smsRepository.appendLog({
      queueItemId: item.id,
      type: item.type,
      channel: item.channel ?? DEFAULT_MESSAGE_CHANNEL,
      clientId: item.clientId,
      bookingId: item.bookingId,
      phone: item.phone,
      message: item.message,
      status: "cancelled",
      provider: getChannelProvider(item.channel ?? DEFAULT_MESSAGE_CHANNEL).name
    });
  }

  return toCancel.length;
}

// ---------------------------------------------------------------------------
// Admin queue actions
// ---------------------------------------------------------------------------

export async function cancelQueueItem(id: string): Promise<SmsQueueItem | null> {
  const item = await smsRepository.getQueueItem(id);

  if (!item || (item.status !== "scheduled" && item.status !== "failed")) {
    return item;
  }

  const updated = await smsRepository.updateQueueItem(id, { status: "cancelled" });
  await smsRepository.appendLog({
    queueItemId: id,
    type: item.type,
    channel: item.channel ?? DEFAULT_MESSAGE_CHANNEL,
    clientId: item.clientId,
    bookingId: item.bookingId,
    phone: item.phone,
    message: item.message,
    status: "cancelled",
    provider: getChannelProvider(item.channel ?? DEFAULT_MESSAGE_CHANNEL).name
  });

  return updated;
}

/**
 * Manually dispatch a scheduled/failed item now. Respects the safety gate: with
 * a real provider and auto-send disabled it is not sent (kept scheduled) and a
 * reason is returned. The mock provider always logs.
 */
export async function sendQueueItemNow(
  id: string
): Promise<{ item: SmsQueueItem | null; dispatched: boolean; reason?: string }> {
  const item = await smsRepository.getQueueItem(id);

  if (!item) {
    return { item: null, dispatched: false, reason: "not_found" };
  }

  if (item.status === "sent") {
    return { item, dispatched: false, reason: "already_sent" };
  }

  const settings = (await appRepository.getData()).settings;

  if (!isDispatchAllowed(settings, item.channel ?? DEFAULT_MESSAGE_CHANNEL)) {
    // Ensure it is at least in a re-tryable state and inform the caller.
    const reset =
      item.status === "cancelled"
        ? await smsRepository.updateQueueItem(id, { status: "scheduled" })
        : item;
    return {
      item: reset,
      dispatched: false,
      reason: isSmsDemoMode() ? "demo_mode" : "auto_send_disabled"
    };
  }

  if (item.status === "cancelled") {
    await smsRepository.updateQueueItem(id, { status: "scheduled" });
  }

  const dispatched = await dispatchQueueItem(id);
  return { item: dispatched, dispatched: dispatched?.status === "sent" };
}

/** Reset a failed/cancelled item to scheduled and try dispatching again. */
export async function resendQueueItem(id: string) {
  const item = await smsRepository.getQueueItem(id);

  if (!item) {
    return { item: null, dispatched: false, reason: "not_found" };
  }

  await smsRepository.updateQueueItem(id, { status: "scheduled" });
  return sendQueueItemNow(id);
}

// ---------------------------------------------------------------------------
// Batch reminder generation (for bookings confirmed before reminders existed)
// ---------------------------------------------------------------------------

export async function generateReminders(): Promise<{
  created: number;
  skipped: number;
}> {
  const data = await appRepository.getData();
  const settings = data.settings;

  if (settings.smsReminderEnabled === false) {
    return { created: 0, skipped: 0 };
  }

  const today = clinicToday();
  const upcoming = data.bookings.filter(
    (booking) => booking.status === "confirmed" && booking.date >= today
  );

  let created = 0;
  let skipped = 0;

  for (const booking of upcoming) {
    const before = await smsRepository.listQueue();
    await scheduleBookingReminders(booking);
    const after = await smsRepository.listQueue();
    const delta = after.length - before.length;

    if (delta > 0) {
      created += delta;
    } else {
      skipped += 1;
    }
  }

  return { created, skipped };
}

// ---------------------------------------------------------------------------
// Manual campaign send (birthday / loyalty / custom to selected clients)
// ---------------------------------------------------------------------------

export type ManualSendResult = {
  total: number;
  dispatched: number;
  scheduled: number;
  skipped: number;
  duplicates: number;
};

export async function sendManualCampaign(params: {
  clientIds: string[];
  type: SmsType;
  templateId?: string;
  customMessage?: string;
  discount?: string;
}): Promise<ManualSendResult> {
  const data = await appRepository.getData();
  const settings = data.settings;
  const templates = data.smsTemplates;
  const template =
    (params.templateId
      ? templates.find((item) => item.id === params.templateId)
      : undefined) ??
    templates.find((item) => item.type === params.type && item.enabled);

  const result: ManualSendResult = {
    total: 0,
    dispatched: 0,
    scheduled: 0,
    skipped: 0,
    duplicates: 0
  };

  const selected = data.clients.filter((client) =>
    params.clientIds.includes(client.id)
  );

  for (const client of selected) {
    result.total += 1;

    const variables: Partial<SmsTemplateVariables> = {
      clientName: client.fullName,
      phone: client.normalizedPhone || client.phone,
      doctorName: DEFAULT_DOCTOR_NAME,
      clinicName: DEFAULT_CLINIC_NAME,
      discount: params.discount ?? "",
      customMessage: params.customMessage ?? ""
    };

    const message = template
      ? renderTemplateBody(template.body, variables)
      : (params.customMessage ?? "").trim();

    if (!message) {
      result.skipped += 1;
      continue;
    }

    const outcome = await enqueueSms(
      {
        type: params.type,
        channel: channelOf(client),
        phone: client.normalizedPhone || client.phone,
        message,
        clientId: client.id,
        // Manual campaigns may legitimately repeat, so no per-booking dedupe.
        dedupe: false
      },
      settings
    );

    if (outcome.status === "dispatched") {
      result.dispatched += 1;
    } else if (outcome.status === "scheduled") {
      result.scheduled += 1;
    } else if (outcome.status === "duplicate") {
      result.duplicates += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}

export const smsRuntimeInfo = () => ({
  provider: getSmsProviderName(),
  isMock: isMockProvider(),
  // No provider can really deliver yet: nothing goes to clients.
  demoMode: isSmsDemoMode(),
  autoSendEnv: isAutoSendEnvEnabled(),
  // Configuration info only — the doctor's future SIM/sender number. Displayed
  // in /admin/sms; it does NOT enable real sending while the provider is mock.
  senderPhone: (process.env.SMS_SENDER_PHONE ?? "").trim(),
  defaultCountry: (process.env.SMS_DEFAULT_COUNTRY ?? "AM").trim(),
  defaultCountryCode: (process.env.SMS_DEFAULT_COUNTRY_CODE ?? "+374").trim(),
  // Per-channel connection state for /admin/sms (WhatsApp/Viber/Telegram: demo).
  channels: channelStatuses()
});
