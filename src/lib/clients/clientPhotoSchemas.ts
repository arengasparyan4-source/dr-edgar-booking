import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));

export const clientPhotoCategorySchema = z.enum([
  "before",
  "after",
  "document",
  "other"
]);

export const clientPhotoMetadataSchema = z.object({
  category: clientPhotoCategorySchema.default("other"),
  procedureId: optionalText,
  bookingId: optionalText,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: optionalText
});

export const clientPhotoPatchSchema = clientPhotoMetadataSchema.partial();
