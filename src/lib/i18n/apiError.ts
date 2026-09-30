import type { AdminTranslation } from "./adminTranslations";

type ApiErrorBody = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
};

/**
 * Translate an API error response body into a localized, user-facing string.
 *
 * API routes attach a stable `code` (see src/lib/api/responses.ts). We look it
 * up in the current language's `errors` block and fall back to a generic message
 * when the code is missing or unknown — we never surface the raw English
 * `error`/`message` fields to the user.
 */
export const translateApiError = (
  data: unknown,
  t: AdminTranslation
): string => {
  const body = (data ?? {}) as ApiErrorBody;
  const errors = t.errors as Record<string, string>;
  const code = typeof body.code === "string" ? body.code : "";

  return errors[code] ?? t.errors.generic;
};
