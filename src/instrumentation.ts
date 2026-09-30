/**
 * Runs once when the Next.js server starts. Closes confirmed bookings whose
 * end time has already passed (see autoCompleteBookings).
 */
export async function register() {
  // Only in the Node.js server, and never while `next build` runs: the build
  // must not touch storage/app-data.json.
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  try {
    const { autoCompletePastBookings } = await import(
      "@/lib/bookings/autoCompleteBookings"
    );
    await autoCompletePastBookings();
  } catch (error) {
    console.warn("[instrumentation] auto-complete at startup failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
