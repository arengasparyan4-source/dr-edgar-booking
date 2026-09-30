import type { AppData, Booking } from "@/types/domain";
import { appRepository } from "@/lib/repositories/appRepository";
import { clinicToUtc } from "@/lib/time/clinicTime";

export type AutoCompleteResult = {
  completedBookingIds: string[];
  updatedClientIds: string[];
};

const hasEnded = (booking: Booking, now: Date) => {
  try {
    return clinicToUtc(booking.date, booking.endTime).getTime() <= now.getTime();
  } catch {
    return false;
  }
};

/**
 * Pure step: every confirmed booking whose end time (clinic zone) has passed
 * becomes completed, and its client's visitsCount / lastVisitDate are updated
 * in the same data - so one run can never count a visit twice.
 */
export function applyAutoComplete(
  data: AppData,
  now: Date
): { data: AppData; result: AutoCompleteResult } {
  const completedAt = now.toISOString();
  const completed: Booking[] = [];
  const bookings = data.bookings.map((booking) => {
    if (booking.status !== "confirmed" || !hasEnded(booking, now)) {
      return booking;
    }

    const updated: Booking = {
      ...booking,
      status: "completed",
      completedAt,
      updatedAt: completedAt
    };
    completed.push(updated);
    return updated;
  });

  if (!completed.length) {
    return { data, result: { completedBookingIds: [], updatedClientIds: [] } };
  }

  const visitsByClient = new Map<string, { count: number; lastDate: string }>();

  for (const booking of completed) {
    if (!booking.clientId) {
      continue;
    }

    const entry = visitsByClient.get(booking.clientId) ?? { count: 0, lastDate: "" };
    entry.count += 1;
    entry.lastDate = booking.date > entry.lastDate ? booking.date : entry.lastDate;
    visitsByClient.set(booking.clientId, entry);
  }

  const updatedClientIds: string[] = [];
  const clients = data.clients.map((client) => {
    const visits = visitsByClient.get(client.id);

    if (!visits) {
      return client;
    }

    updatedClientIds.push(client.id);
    return {
      ...client,
      visitsCount: (client.visitsCount ?? 0) + visits.count,
      // Never move backwards (an imported or later visit may be newer).
      lastVisitDate:
        client.lastVisitDate && client.lastVisitDate > visits.lastDate
          ? client.lastVisitDate
          : visits.lastDate,
      updatedAt: completedAt
    };
  });

  return {
    data: { ...data, bookings, clients },
    result: {
      completedBookingIds: completed.map((booking) => booking.id),
      updatedClientIds
    }
  };
}

/** Runs the auto-completion as one write on fresh data. */
export async function autoCompletePastBookings(
  now: Date = new Date()
): Promise<AutoCompleteResult> {
  let result: AutoCompleteResult = { completedBookingIds: [], updatedClientIds: [] };
  const snapshot = await appRepository.getData();

  // Read-only pre-check so the usual "nothing to do" case does not rewrite
  // the data file; the real decision is made again inside the write.
  const hasDueBooking = snapshot.bookings.some(
    (booking) => booking.status === "confirmed" && hasEnded(booking, now)
  );

  if (!hasDueBooking) {
    return result;
  }

  await appRepository.updateData((data) => {
    const applied = applyAutoComplete(data, now);
    result = applied.result;
    return applied.data;
  });

  if (result.completedBookingIds.length) {
    console.info("[autoCompleteBookings] completed past confirmed bookings", {
      bookings: result.completedBookingIds.length,
      clients: result.updatedClientIds.length
    });
  }

  return result;
}

const minIntervalMs = 5 * 60 * 1000;
let lastRunAt = 0;
let running: Promise<unknown> | null = null;

/**
 * Cheap to call on every admin request: runs at most once per 5 minutes per
 * process and never throws (a failure must not break the admin page).
 */
export async function autoCompletePastBookingsThrottled() {
  const now = Date.now();

  if (running || now - lastRunAt < minIntervalMs) {
    return;
  }

  lastRunAt = now;
  running = autoCompletePastBookings()
    .catch((error) => {
      console.warn("[autoCompleteBookings] run failed", {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    })
    .finally(() => {
      running = null;
    });

  await running;
}
