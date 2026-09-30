/**
 * Side effects of a booking change (Google Calendar, SMS, Telegram) must not
 * undo the change itself: a failure is logged and reported back as a warning.
 * Returns the recorder for one module, e.g. sideEffectWarner("[confirmBooking]").
 */
export const sideEffectWarner =
  (scope: string) =>
  (warnings: string[], warning: string, error: unknown, details: Record<string, unknown> = {}) => {
    warnings.push(warning);
    console.warn(scope, warning, {
      ...details,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  };
