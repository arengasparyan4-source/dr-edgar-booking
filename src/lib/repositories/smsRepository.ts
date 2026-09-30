import { randomUUID } from "node:crypto";
import { appRepository } from "@/lib/repositories/appRepository";
import type { SmsLog, SmsQueueItem, SmsTemplate } from "@/types/sms";

/** Keep the log archive bounded so storage/app-data.json cannot grow forever. */
const MAX_LOGS = 2000;

const nowIso = () => new Date().toISOString();

export const smsRepository = {
  async listTemplates(): Promise<SmsTemplate[]> {
    const data = await appRepository.getData();
    return data.smsTemplates;
  },

  async getTemplate(id: string): Promise<SmsTemplate | null> {
    const data = await appRepository.getData();
    return data.smsTemplates.find((template) => template.id === id) ?? null;
  },

  async updateTemplate(
    id: string,
    patch: Partial<Pick<SmsTemplate, "name" | "body" | "enabled" | "language">>
  ): Promise<SmsTemplate | null> {
    let updated: SmsTemplate | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      smsTemplates: data.smsTemplates.map((template) => {
        if (template.id !== id) {
          return template;
        }

        updated = {
          ...template,
          name: patch.name ?? template.name,
          body: patch.body ?? template.body,
          enabled: patch.enabled ?? template.enabled,
          language: patch.language ?? template.language,
          updatedAt: nowIso()
        };
        return updated;
      })
    }));

    return updated;
  },

  async listQueue(): Promise<SmsQueueItem[]> {
    const data = await appRepository.getData();
    return [...data.smsQueue].sort((a, b) =>
      a.scheduledAt.localeCompare(b.scheduledAt)
    );
  },

  async getQueueItem(id: string): Promise<SmsQueueItem | null> {
    const data = await appRepository.getData();
    return data.smsQueue.find((item) => item.id === id) ?? null;
  },

  async createQueueItem(
    input: Omit<SmsQueueItem, "id" | "createdAt" | "updatedAt">
  ): Promise<SmsQueueItem> {
    const now = nowIso();
    const item: SmsQueueItem = {
      ...input,
      id: `sms_${randomUUID()}`,
      createdAt: now,
      updatedAt: now
    };

    await appRepository.updateData((data) => ({
      ...data,
      smsQueue: [...data.smsQueue, item]
    }));

    return item;
  },

  async updateQueueItem(
    id: string,
    patch: Partial<SmsQueueItem>
  ): Promise<SmsQueueItem | null> {
    let updated: SmsQueueItem | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      smsQueue: data.smsQueue.map((item) => {
        if (item.id !== id) {
          return item;
        }

        updated = {
          ...item,
          ...patch,
          id: item.id,
          createdAt: item.createdAt,
          updatedAt: nowIso()
        };
        return updated;
      })
    }));

    return updated;
  },

  async listLogs(): Promise<SmsLog[]> {
    const data = await appRepository.getData();
    return [...data.smsLogs].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  },

  async appendLog(input: Omit<SmsLog, "id" | "createdAt">): Promise<SmsLog> {
    const log: SmsLog = {
      ...input,
      id: `log_${randomUUID()}`,
      createdAt: nowIso()
    };

    await appRepository.updateData((data) => ({
      ...data,
      smsLogs: [...data.smsLogs, log].slice(-MAX_LOGS)
    }));

    return log;
  }
};
