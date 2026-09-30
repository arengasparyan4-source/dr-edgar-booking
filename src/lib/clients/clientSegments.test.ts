import { describe, expect, it } from "vitest";
import {
  daysBetweenDates,
  getActivitySegment,
  getClientStats,
  groupBookingsByClient,
  percentOf,
  rankClients
} from "@/lib/clients/clientSegments";
import type { Booking, BookingStatus, Client } from "@/types/domain";

const TODAY = "2026-09-30";

const client = (id: string, patch: Partial<Client> = {}): Client => ({
  id,
  fullName: `Client ${id}`,
  phone: `+3747700000${id.slice(-1)}`,
  normalizedPhone: `+3747700000${id.slice(-1)}`,
  status: "active",
  isVip: false,
  isBlacklisted: false,
  createdAt: "2025-01-01T10:00:00.000Z",
  updatedAt: "2025-01-01T10:00:00.000Z",
  ...patch
});

let bookingNumber = 0;
const booking = (
  clientId: string,
  date: string,
  status: BookingStatus,
  totalPrice = 50000
): Booking => {
  bookingNumber += 1;
  return {
    id: `b${bookingNumber}`,
    clientId,
    firstName: "A",
    lastName: "B",
    phone: "+37477000000",
    selectedServiceIds: [],
    servicesSnapshot: [],
    totalDurationMinutes: 60,
    totalPrice,
    date,
    startTime: "10:00",
    endTime: "11:00",
    status,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`
  };
};

describe("daysBetweenDates", () => {
  it("counts whole calendar days", () => {
    expect(daysBetweenDates("2026-09-01", TODAY)).toBe(29);
    expect(daysBetweenDates("2025-09-30", TODAY)).toBe(365);
    expect(daysBetweenDates(TODAY, "2026-09-29")).toBe(-1);
  });

  it("ignores the time part of timestamps", () => {
    expect(daysBetweenDates("2026-09-29T23:59:00.000Z", TODAY)).toBe(1);
  });
});

describe("getClientStats", () => {
  it("counts only completed visits up to today and sums their price", () => {
    const stats = getClientStats(
      client("c1"),
      [
        booking("c1", "2026-08-01", "completed", 70000),
        booking("c1", "2026-09-01", "completed", 30000),
        booking("c1", "2026-09-10", "cancelled", 90000),
        booking("c1", "2026-09-12", "no_show", 90000),
        booking("c1", "2026-10-05", "confirmed", 90000)
      ],
      TODAY
    );

    expect(stats.visits).toBe(2);
    expect(stats.totalSpent).toBe(100000);
    expect(stats.lastVisitDate).toBe("2026-09-01");
    expect(stats.hasUpcoming).toBe(true);
    expect(stats.nextBookingDate).toBe("2026-10-05");
  });

  it("keeps imported history from the stored counter", () => {
    const stats = getClientStats(
      client("c1", { visitsCount: 9, lastVisitDate: "2026-02-01" }),
      [booking("c1", "2026-01-15", "completed")],
      TODAY
    );

    expect(stats.visits).toBe(9);
    expect(stats.lastVisitDate).toBe("2026-02-01");
  });

  it("does not treat a past pending request as upcoming", () => {
    const stats = getClientStats(client("c1"), [booking("c1", "2026-09-20", "pending")], TODAY);
    expect(stats.hasUpcoming).toBe(false);
  });

  it("reads VIP and blacklist from the flags and the status", () => {
    expect(getClientStats(client("c1", { status: "vip" }), [], TODAY).isVip).toBe(true);
    expect(getClientStats(client("c1", { isBlacklisted: true }), [], TODAY).isBlacklisted).toBe(true);
  });
});

describe("getActivitySegment", () => {
  const segment = (patch: Partial<Client>, stats: { visits: number; lastVisitDate?: string; hasUpcoming: boolean }) =>
    getActivitySegment({ status: "active", createdAt: "2025-01-01T00:00:00.000Z", ...patch }, stats, TODAY);

  it("active: a visit within 180 days", () => {
    expect(segment({}, { visits: 3, lastVisitDate: "2026-04-03", hasUpcoming: false })).toBe("active");
  });

  it("sleeping: 181-365 days without a visit", () => {
    expect(segment({}, { visits: 3, lastVisitDate: "2026-04-02", hasUpcoming: false })).toBe("sleeping");
    expect(segment({}, { visits: 3, lastVisitDate: "2025-09-30", hasUpcoming: false })).toBe("sleeping");
  });

  it("lost: more than a year without a visit", () => {
    expect(segment({}, { visits: 3, lastVisitDate: "2025-09-29", hasUpcoming: false })).toBe("lost");
  });

  it("an upcoming booking makes a sleeping client active again", () => {
    expect(segment({}, { visits: 3, lastVisitDate: "2025-01-01", hasUpcoming: true })).toBe("active");
  });

  it("new: created within 30 days with at most one visit", () => {
    expect(segment({ createdAt: "2026-09-10T10:00:00.000Z" }, { visits: 1, lastVisitDate: "2026-09-20", hasUpcoming: false })).toBe("new");
    expect(segment({ createdAt: "2026-08-20T10:00:00.000Z" }, { visits: 0, hasUpcoming: true })).toBe("active");
  });

  it("status \"new\" from an online booking does not stick forever", () => {
    expect(segment({ status: "new" }, { visits: 10, lastVisitDate: "2026-09-01", hasUpcoming: false })).toBe("active");
  });

  it("a segment the doctor set by hand wins", () => {
    expect(segment({ status: "lost" }, { visits: 10, lastVisitDate: "2026-09-01", hasUpcoming: false })).toBe("lost");
    expect(segment({ status: "inactive" }, { visits: 10, lastVisitDate: "2026-09-01", hasUpcoming: false })).toBe("lost");
  });

  it("never visited and not new: sleeping", () => {
    expect(segment({}, { visits: 0, hasUpcoming: false })).toBe("sleeping");
  });
});

describe("groupBookingsByClient", () => {
  it("falls back to the phone number for bookings without clientId", () => {
    const clients = [client("c1"), client("c2")];
    const orphan = { ...booking("", "2026-09-01", "completed"), clientId: undefined, phone: clients[1].normalizedPhone };
    const map = groupBookingsByClient(clients, [booking("c1", "2026-09-01", "completed"), orphan]);

    expect(map.get("c1")).toHaveLength(1);
    expect(map.get("c2")).toEqual([orphan]);
  });
});

describe("percentOf", () => {
  it("rounds and handles an empty base", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe("rankClients", () => {
  it("orders by visits, then total, shares ranks on ties and skips blacklist/no visits", () => {
    const clients = [
      client("c1"),
      client("c2"),
      client("c3"),
      client("c4", { isBlacklisted: true }),
      client("c5"),
      client("c6")
    ];
    const bookings = [
      booking("c1", "2026-09-01", "completed", 10000),
      booking("c1", "2026-09-02", "completed", 10000),
      booking("c2", "2026-09-01", "completed", 50000),
      booking("c2", "2026-09-02", "completed", 50000),
      booking("c3", "2026-09-01", "completed", 50000),
      booking("c3", "2026-09-03", "completed", 50000),
      booking("c4", "2026-09-01", "completed", 500000),
      booking("c4", "2026-09-02", "completed", 500000),
      booking("c4", "2026-09-03", "completed", 500000),
      booking("c5", "2026-09-01", "completed", 900000),
      booking("c6", "2026-10-10", "confirmed", 900000)
    ];

    const ranked = rankClients(clients, groupBookingsByClient(clients, bookings), TODAY);

    expect(ranked.map((entry) => [entry.client.id, entry.rank])).toEqual([
      ["c3", 1], // same visits and total as c2, more recent visit first
      ["c2", 1],
      ["c1", 3],
      ["c5", 4]
    ]);
  });
});
