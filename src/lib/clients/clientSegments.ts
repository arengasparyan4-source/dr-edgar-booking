import { addDays } from "@/lib/availability/time";
import type { Booking, BookingStatus, Client } from "@/types/domain";

/**
 * CRM segments and the activity rating, computed from a client and their
 * bookings. Pure functions: "today" (clinic date, YYYY-MM-DD) is passed in, so
 * the same numbers come out on the server, in the browser and in tests.
 *
 * Activity segments are mutually exclusive - every client is in exactly one of
 * new / active / sleeping / lost - so their percentages add up to 100.
 * VIP, blacklist and the other groups are extra filters on top.
 */

/** A visit within this many days keeps the client "active". */
export const ACTIVE_DAYS = 180;
/** No visit for longer than this: "lost". Between the two: "sleeping". */
export const LOST_DAYS = 365;
/** Clients created this recently with at most one visit are "new". */
export const NEW_CLIENT_DAYS = 30;

export type ActivitySegment = "new" | "active" | "sleeping" | "lost";

const upcomingStatuses = new Set<BookingStatus>(["pending", "confirmed", "reschedule_requested"]);

export type ClientStats = {
  /** Completed visits: the stored counter (it includes imported history) or the completed bookings, whichever is larger. */
  visits: number;
  /** Sum of completed bookings, AMD. */
  totalSpent: number;
  lastVisitDate?: string;
  hasUpcoming: boolean;
  nextBookingDate?: string;
  segment: ActivitySegment;
  isVip: boolean;
  isBlacklisted: boolean;
};

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `from` is later. */
export const daysBetweenDates = (from: string, to: string) => {
  const toUtc = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000);
};

const maxDate = (...values: Array<string | undefined>) =>
  values.filter((value): value is string => Boolean(value)).sort().at(-1);

/** Clinic date of an ISO timestamp is close enough here; only the day matters. */
const dateOf = (value: string) => value.slice(0, 10);

export function getClientStats(client: Client, bookings: Booking[], today: string): ClientStats {
  const completed = bookings.filter(
    (booking) => booking.status === "completed" && booking.date <= today
  );
  const upcoming = bookings
    .filter((booking) => upcomingStatuses.has(booking.status) && booking.date >= today)
    .map((booking) => booking.date)
    .sort();
  const visits = Math.max(client.visitsCount ?? 0, completed.length);
  const lastVisitDate = maxDate(
    client.lastVisitDate && client.lastVisitDate <= today ? client.lastVisitDate : undefined,
    ...completed.map((booking) => booking.date)
  );
  const nextBookingDate =
    upcoming[0] ??
    (client.nextBookingDate && client.nextBookingDate >= today ? client.nextBookingDate : undefined);
  const hasUpcoming = Boolean(nextBookingDate);
  const isBlacklisted = Boolean(client.isBlacklisted || client.status === "blacklist");
  const isVip = Boolean(client.isVip || client.status === "vip");

  return {
    visits,
    totalSpent: completed.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
    lastVisitDate,
    hasUpcoming,
    nextBookingDate,
    segment: getActivitySegment(client, { visits, lastVisitDate, hasUpcoming }, today),
    isVip,
    isBlacklisted
  };
}

export function getActivitySegment(
  client: Pick<Client, "status" | "createdAt">,
  stats: { visits: number; lastVisitDate?: string; hasUpcoming: boolean },
  today: string
): ActivitySegment {
  // A segment the doctor set by hand wins over the computed one. "new" is not
  // one of them: every online booking creates its client with status "new",
  // so it would never go away.
  if (client.status === "sleeping" || client.status === "lost") {
    return client.status;
  }
  if (client.status === "inactive") {
    return "lost";
  }

  const createdDaysAgo = daysBetweenDates(dateOf(client.createdAt), today);
  if (stats.visits <= 1 && createdDaysAgo <= NEW_CLIENT_DAYS) {
    return "new";
  }
  if (stats.hasUpcoming) {
    return "active";
  }
  if (!stats.lastVisitDate) {
    // Never visited and not new any more: needs a follow-up.
    return "sleeping";
  }

  const inactiveDays = daysBetweenDates(stats.lastVisitDate, today);
  if (inactiveDays <= ACTIVE_DAYS) {
    return "active";
  }
  return inactiveDays > LOST_DAYS ? "lost" : "sleeping";
}

/** Bookings grouped by client id; bookings without clientId are matched by phone. */
export function groupBookingsByClient(clients: Client[], bookings: Booking[]) {
  const phoneToClientId = new Map(clients.map((client) => [client.normalizedPhone, client.id]));
  const map = new Map<string, Booking[]>();

  for (const booking of bookings) {
    const clientId = booking.clientId || phoneToClientId.get(booking.phone);
    if (!clientId) {
      continue;
    }
    const list = map.get(clientId);
    if (list) {
      list.push(booking);
    } else {
      map.set(clientId, [booking]);
    }
  }

  return map;
}

/** Share of `count` in `total` as a whole percent (0 when there is nothing). */
export const percentOf = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 100) : 0;

export type RankedClient = {
  client: Client;
  stats: ClientStats;
  rank: number;
};

/**
 * Activity rating: most completed visits first, then the larger total, then
 * the more recent visit. Clients without a visit and blacklisted clients are
 * not ranked. Equal visits and totals share a rank ("1, 2, 2, 4").
 */
export function rankClients(
  clients: Client[],
  bookingsByClient: Map<string, Booking[]>,
  today: string
): RankedClient[] {
  const entries = clients
    .map((client) => ({
      client,
      stats: getClientStats(client, bookingsByClient.get(client.id) ?? [], today)
    }))
    .filter((entry) => entry.stats.visits > 0 && !entry.stats.isBlacklisted)
    .sort(
      (a, b) =>
        b.stats.visits - a.stats.visits ||
        b.stats.totalSpent - a.stats.totalSpent ||
        (b.stats.lastVisitDate ?? "").localeCompare(a.stats.lastVisitDate ?? "") ||
        a.client.fullName.localeCompare(b.client.fullName)
    );

  const ranked: RankedClient[] = [];
  entries.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const tied =
      previous &&
      previous.stats.visits === entry.stats.visits &&
      previous.stats.totalSpent === entry.stats.totalSpent;
    ranked.push({ ...entry, rank: tied ? previous.rank : index + 1 });
  });

  return ranked;
}

/** How many top clients get the "top" badge in the list. */
export const TOP_CLIENTS_COUNT = 10;

/** The date `days` before `today`; handy for building "N days ago" data. */
export const daysAgo = (today: string, days: number) => addDays(today, -days);
