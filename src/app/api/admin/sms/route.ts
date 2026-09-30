import { type NextRequest, NextResponse } from "next/server";
import { isSmsDemoMode } from "@/lib/sms/providers";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { smsRepository } from "@/lib/repositories/smsRepository";
import {
  cancelQueueItem,
  generateReminders,
  resendQueueItem,
  sendManualCampaign,
  sendQueueItemNow,
  smsRuntimeInfo
} from "@/lib/sms/smsService";
import type { Settings } from "@/types/domain";
import type { SmsLog, SmsQueueItem, SmsType } from "@/types/sms";

export const runtime = "nodejs";

const RECENT_LOGS = 300;

const smsTypeSchema = z.enum([
  "booking_confirmation",
  "booking_reminder",
  "booking_cancelled",
  "booking_rescheduled",
  "birthday",
  "loyalty",
  "custom"
]);

const manualSendSchema = z.object({
  action: z.literal("manualSend"),
  clientIds: z.array(z.string().min(1)).min(1),
  type: smsTypeSchema,
  templateId: z.string().optional(),
  customMessage: z.string().optional(),
  discount: z.string().optional()
});

const generateRemindersSchema = z.object({
  action: z.literal("generateReminders")
});

const queueActionSchema = z.object({
  action: z.literal("queueAction"),
  id: z.string().min(1),
  queueAction: z.enum(["cancel", "resend", "sendNow"])
});

const updateTemplateSchema = z.object({
  action: z.literal("updateTemplate"),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  enabled: z.boolean().optional()
});

const updateSettingsSchema = z.object({
  action: z.literal("updateSettings"),
  smsAutoSendEnabled: z.boolean().optional(),
  smsReminderEnabled: z.boolean().optional(),
  smsReminderOffsets: z.array(z.number().int().min(0).max(14)).max(4).optional(),
  smsBirthdayAutoSendEnabled: z.boolean().optional()
});

const actionSchema = z.discriminatedUnion("action", [
  manualSendSchema,
  generateRemindersSchema,
  queueActionSchema,
  updateTemplateSchema,
  updateSettingsSchema
]);

type QueueItemWithName = SmsQueueItem & { clientName: string };
type LogWithName = SmsLog & { clientName: string };

/** SMS switches as the admin page shows them, with the defaults filled in. */
const smsSettingsView = (settings: Settings) => ({
  smsAutoSendEnabled: settings.smsAutoSendEnabled ?? false,
  smsReminderEnabled: settings.smsReminderEnabled ?? true,
  smsReminderOffsets: settings.smsReminderOffsets ?? [1],
  smsBirthdayAutoSendEnabled: settings.smsBirthdayAutoSendEnabled ?? false
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const data = await appRepository.getData();
    const nameById = new Map(
      data.clients.map((client) => [client.id, client.fullName])
    );

    const resolveName = (clientId?: string) =>
      (clientId && nameById.get(clientId)) || "";

    // Demo mode: provider errors ("SIM/GSM sender is not connected...") are
    // expected noise, not something the doctor can act on - do not show them.
    const demoMode = isSmsDemoMode();

    const queue: QueueItemWithName[] = [...data.smsQueue]
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .map((item) => ({
        ...item,
        lastError: demoMode ? undefined : item.lastError,
        clientName: resolveName(item.clientId)
      }));

    const logs: LogWithName[] = [...data.smsLogs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, RECENT_LOGS)
      .map((log) => ({
        ...log,
        error: demoMode && log.status === "failed" ? undefined : log.error,
        clientName: resolveName(log.clientId)
      }));

    const clients = data.clients.map((client) => ({
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      normalizedPhone: client.normalizedPhone,
      status: client.status,
      isVip: client.isVip,
      isBlacklisted: client.isBlacklisted,
      birthDate: client.birthDate ?? "",
      lastVisitDate: client.lastVisitDate ?? "",
      nextBookingDate: client.nextBookingDate ?? "",
      createdAt: client.createdAt
    }));

    const bookings = data.bookings.map((booking) => ({
      id: booking.id,
      clientId: booking.clientId ?? "",
      phone: booking.phone,
      date: booking.date,
      status: booking.status
    }));

    return ok({
      runtime: smsRuntimeInfo(),
      settings: smsSettingsView(data.settings),
      templates: data.smsTemplates,
      queue,
      logs,
      clients,
      bookings
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = actionSchema.parse(await request.json());

    if (body.action === "manualSend") {
      const result = await sendManualCampaign({
        clientIds: body.clientIds,
        type: body.type as SmsType,
        templateId: body.templateId,
        customMessage: body.customMessage,
        discount: body.discount
      });
      return ok({ success: true, result });
    }

    if (body.action === "generateReminders") {
      const result = await generateReminders();
      return ok({ success: true, result });
    }

    if (body.action === "queueAction") {
      if (body.queueAction === "cancel") {
        const item = await cancelQueueItem(body.id);
        return ok({ success: true, item });
      }

      if (body.queueAction === "resend") {
        const outcome = await resendQueueItem(body.id);
        return ok({ success: true, ...outcome });
      }

      const outcome = await sendQueueItemNow(body.id);
      return ok({ success: true, ...outcome });
    }

    if (body.action === "updateTemplate") {
      const template = await smsRepository.updateTemplate(body.id, {
        name: body.name,
        body: body.body,
        enabled: body.enabled
      });

      if (!template) {
        return NextResponse.json(
          {
            success: false,
            code: "template_not_found",
            error: "Template not found",
            message: "Template not found"
          },
          { status: 404 }
        );
      }

      return ok({ success: true, template });
    }

    // updateSettings — only include keys the caller actually sent, so a partial
    // toggle never clobbers other SMS settings with undefined.
    const settingsPatch: Partial<{
      smsAutoSendEnabled: boolean;
      smsReminderEnabled: boolean;
      smsReminderOffsets: number[];
      smsBirthdayAutoSendEnabled: boolean;
    }> = {};

    if (body.smsAutoSendEnabled !== undefined) {
      settingsPatch.smsAutoSendEnabled = body.smsAutoSendEnabled;
    }
    if (body.smsReminderEnabled !== undefined) {
      settingsPatch.smsReminderEnabled = body.smsReminderEnabled;
    }
    if (body.smsReminderOffsets !== undefined) {
      settingsPatch.smsReminderOffsets = body.smsReminderOffsets;
    }
    if (body.smsBirthdayAutoSendEnabled !== undefined) {
      settingsPatch.smsBirthdayAutoSendEnabled = body.smsBirthdayAutoSendEnabled;
    }

    const data = await appRepository.updateSettings(settingsPatch);

    return ok({
      success: true,
      settings: smsSettingsView(data.settings)
    });
  } catch (error) {
    return errorResponse(error);
  }
}
