import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const ok = <T>(data: T) => NextResponse.json(data);

// Stable machine-readable codes attached to every error response. The client
// (see src/lib/i18n/apiError.ts) maps these to localized text; the human-readable
// `message` is kept for debugging/logging only.
const codeByMessage: Record<string, string> = {
  Unauthorized: "unauthorized",
  "Invalid phone": "invalid_phone",
  "Client with this phone already exists": "client_phone_exists",
  "Client not found": "client_not_found",
  "Booking not found": "booking_not_found",
  "Note not found": "note_not_found",
  "Photo not found": "photo_not_found",
  "Template not found": "template_not_found",
  "Invalid selected services": "invalid_services",
  "Selected slot is no longer available": "slot_unavailable",
  "Slot is taken": "slot_taken",
  "Service is used by upcoming bookings": "service_in_use",
  "Booking cannot be confirmed from current status": "booking_status_conflict",
  "Booking date/time cannot be changed from current status": "booking_status_conflict",
  "Booking services cannot be changed from current status": "booking_status_conflict",
  "Booking status transition not allowed": "booking_status_conflict",
  "Booking has not started yet": "booking_not_started",
  "Reschedule option not found": "reschedule_option_not_found",
  "Date is outside the booking window": "date_out_of_range",
  "Invalid file type": "invalid_file_type",
  "File too large": "file_too_large",
  "Import file is empty": "import_file_empty",
  "Client upsert failed": "request_failed",
  "Too many requests": "too_many_requests"
};

const statusByCode: Record<string, number> = {
  unauthorized: 401,
  invalid_phone: 400,
  client_phone_exists: 409,
  client_not_found: 404,
  booking_not_found: 404,
  note_not_found: 404,
  photo_not_found: 404,
  template_not_found: 404,
  invalid_services: 400,
  slot_unavailable: 409,
  slot_taken: 409,
  service_in_use: 409,
  booking_status_conflict: 409,
  booking_not_started: 409,
  reschedule_option_not_found: 409,
  date_out_of_range: 400,
  invalid_file_type: 400,
  file_too_large: 400,
  import_file_empty: 400,
  validation_failed: 400,
  too_many_requests: 429,
  request_failed: 500
};

// Validation issues whose message is one of these codes are reported with
// that code instead of the generic validation_failed (see scheduleIssue).
const validationIssueCodes = new Set([
  "invalid_time",
  "invalid_date",
  "time_range_invalid",
  "break_outside_hours",
  "breaks_overlap",
  "duplicate_day",
  "blocked_times_overlap"
]);

export const errorResponse = (error: unknown, fallback = "Request failed") => {
  if (error instanceof ZodError) {
    const specificCode = error.issues
      .map((issue) => issue.message)
      .find((message) => validationIssueCodes.has(message));

    return NextResponse.json(
      {
        success: false,
        code: specificCode ?? "validation_failed",
        error: "Validation failed",
        message: "Validation failed",
        issues: error.issues
      },
      { status: 400 }
    );
  }

  const rawMessage = error instanceof Error ? error.message : fallback;
  const known = Object.prototype.hasOwnProperty.call(codeByMessage, rawMessage);
  const code = codeByMessage[rawMessage] ?? "request_failed";
  const status = statusByCode[code] ?? 500;
  // Unknown errors may carry internals (paths, provider responses, stack
  // details): they are logged here and the caller gets one generic text.
  if (!known) {
    console.error("[api] Unhandled error", rawMessage);
  }
  const message = known ? rawMessage : "Request failed";

  return NextResponse.json(
    {
      success: false,
      code,
      error: message,
      message
    },
    { status }
  );
};
