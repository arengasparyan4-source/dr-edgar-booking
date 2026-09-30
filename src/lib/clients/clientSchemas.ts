import { z } from "zod";
import {
  clockTimeSchema,
  dateKeySchema,
  messageChannelSchema,
  scheduleIssue
} from "@/lib/validation/schemas";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalNumber = z
  .union([z.number(), z.string().trim()])
  .optional()
  .transform((value) => {
    if (value === undefined || value === "") {
      return undefined;
    }

    const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : undefined;
  });

export const clientStatusSchema = z.enum([
  "active",
  "sleeping",
  "lost",
  "new",
  "vip",
  "blacklist",
  "inactive"
]);

export const clientEditorSchema = z.object({
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: optionalText,
  birthDate: optionalText,
  address: optionalText,
  comment: optionalText,
  notes: optionalText,
  balance: optionalNumber,
  discount: optionalNumber,
  status: clientStatusSchema.default("active"),
  isVip: z.boolean().default(false),
  isBlacklisted: z.boolean().default(false),
  preferredChannel: messageChannelSchema.optional()
});

export const clientPatchSchema = clientEditorSchema.partial();

export const procedureRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceName: z.string().trim().min(1),
  serviceId: optionalText,
  preparationName: optionalText,
  preparationType: optionalText,
  amount: optionalText,
  unit: z.enum(["ml", "g", "unit", "other"]).optional(),
  area: optionalText,
  price: optionalNumber,
  doctorNotes: optionalText,
  comment: optionalText,
  bookingId: optionalText
});

export const clientNoteSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  author: optionalText,
  pinned: z.boolean().default(false),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const manualBookingSchema = z
  .object({
    clientId: optionalText,
    fullName: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    selectedServiceIds: z.array(z.string().trim().min(1)).min(1),
    date: dateKeySchema,
    startTime: clockTimeSchema,
    endTime: clockTimeSchema,
    comment: optionalText,
    status: z.enum(["pending", "confirmed"]).default("pending"),
    preferredChannel: messageChannelSchema.optional()
  })
  .refine((value) => value.startTime < value.endTime, {
    message: scheduleIssue.rangeInvalid,
    path: ["endTime"]
  });
