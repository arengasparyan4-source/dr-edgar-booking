import { z } from "zod";
import {
  PHONE_ERROR,
  normalizePhoneNumber
} from "@/lib/phone/armenianPhone";

export const localizedTextSchema = z.object({
  hy: z.string().min(1),
  ru: z.string().min(1),
  en: z.string().min(1)
});

export const phoneSchema = z
  .string()
  .trim()
  .transform((phone, context) => {
    const normalizedPhone = normalizePhoneNumber(phone);

    if (!normalizedPhone) {
      context.addIssue({
        code: "custom",
        message: PHONE_ERROR
      });
      return z.NEVER;
    }

    return normalizedPhone;
  });

/**
 * Messages of schedule/time issues double as API error codes (see
 * errorResponse), so the admin panel can say exactly what is wrong.
 */
export const scheduleIssue = {
  invalidTime: "invalid_time",
  invalidDate: "invalid_date",
  rangeInvalid: "time_range_invalid",
  breakOutsideHours: "break_outside_hours",
  breaksOverlap: "breaks_overlap",
  duplicateDay: "duplicate_day",
  blockedTimesOverlap: "blocked_times_overlap"
} as const;

/** Wall-clock time 00:00-23:59. */
export const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, scheduleIssue.invalidTime);

const isRealDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/** Calendar date YYYY-MM-DD that actually exists (no 2026-02-31). */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, scheduleIssue.invalidDate)
  .refine(isRealDate, scheduleIssue.invalidDate);

const toMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Adds a time_range_invalid issue unless startTime < endTime. */
const requireStartBeforeEnd = <T extends { startTime: string; endTime: string }>(
  value: T,
  context: z.RefinementCtx
) => {
  if (value.startTime >= value.endTime) {
    context.addIssue({
      code: "custom",
      message: scheduleIssue.rangeInvalid,
      path: ["endTime"]
    });
  }
};

const timeRangeShape = {
  startTime: clockTimeSchema,
  endTime: clockTimeSchema
};

const overlaps = (
  first: { startTime: string; endTime: string },
  second: { startTime: string; endTime: string }
) =>
  toMinutes(first.startTime) < toMinutes(second.endTime) &&
  toMinutes(second.startTime) < toMinutes(first.endTime);

export const timeSlotSchema = z
  .object({ date: dateKeySchema, ...timeRangeShape })
  .superRefine(requireStartBeforeEnd);

export const availabilityRequestSchema = z.object({
  selectedServiceIds: z.array(z.string().min(1)).min(1),
  dateFrom: dateKeySchema,
  daysAhead: z.number().int().min(1).max(60).optional(),
  limit: z.number().int().min(1).max(96).optional()
});

export const messageChannelSchema = z.enum(["sms", "whatsapp", "viber", "telegram"]);

export const bookingRequestSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: phoneSchema,
  selectedServiceIds: z.array(z.string().min(1)).min(1),
  selectedSlot: timeSlotSchema,
  comment: z.string().trim().max(1000).optional().default(""),
  // Optional so older clients of the API keep working; an existing client's
  // channel is only changed by an explicit choice.
  preferredChannel: messageChannelSchema.optional()
});

export const serviceSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  name: localizedTextSchema,
  description: localizedTextSchema,
  durationMinutes: z.number().int().min(5).max(600),
  price: z.number().int().min(0),
  active: z.boolean()
});

export const workingHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    ...timeRangeShape,
    breaks: z.array(
      z.object(timeRangeShape).superRefine(requireStartBeforeEnd)
    )
  })
  .superRefine((day, context) => {
    requireStartBeforeEnd(day, context);

    day.breaks.forEach((breakTime, index) => {
      if (breakTime.startTime < day.startTime || breakTime.endTime > day.endTime) {
        context.addIssue({
          code: "custom",
          message: scheduleIssue.breakOutsideHours,
          path: ["breaks", index]
        });
      }

      day.breaks.slice(0, index).forEach((earlier) => {
        if (overlaps(earlier, breakTime)) {
          context.addIssue({
            code: "custom",
            message: scheduleIssue.breaksOverlap,
            path: ["breaks", index]
          });
        }
      });
    });
  });

export const blockedTimeSchema = z
  .object({
    id: z.string().min(1),
    date: dateKeySchema,
    ...timeRangeShape,
    reason: z.string().optional()
  })
  .superRefine(requireStartBeforeEnd);

export const scheduleSchema = z
  .object({
    workingHours: z.array(workingHoursSchema),
    blockedTimes: z.array(blockedTimeSchema)
  })
  .superRefine((schedule, context) => {
    const seenDays = new Set<number>();

    schedule.workingHours.forEach((day, index) => {
      if (seenDays.has(day.dayOfWeek)) {
        context.addIssue({
          code: "custom",
          message: scheduleIssue.duplicateDay,
          path: ["workingHours", index, "dayOfWeek"]
        });
      }
      seenDays.add(day.dayOfWeek);
    });

    // Overlapping (or duplicated) blocked intervals on one date.
    schedule.blockedTimes.forEach((blocked, index) => {
      const clash = schedule.blockedTimes
        .slice(0, index)
        .some((earlier) => earlier.date === blocked.date && overlaps(earlier, blocked));

      if (clash) {
        context.addIssue({
          code: "custom",
          message: scheduleIssue.blockedTimesOverlap,
          path: ["blockedTimes", index]
        });
      }
    });
  });

export const portfolioItemSchema = z.object({
  id: z.string().min(1),
  imageUrl: z.string().min(1),
  title: localizedTextSchema,
  order: z.number().int().min(0),
  active: z.boolean()
});

export const settingsSchema = z.object({
  address: z.string().min(1),
  phone: z.string().min(1),
  instagramUrl: z.string().url(),
  googleCalendarId: z.string().optional(),
  telegramChatId: z.string().optional(),
  googleCalendarEnabled: z.boolean(),
  bookingHorizonDays: z.number().int().min(7).max(60).default(7),
  minBookingLeadMinutes: z.number().int().min(0).max(1440).default(60),
  aboutDoctor: localizedTextSchema
});
