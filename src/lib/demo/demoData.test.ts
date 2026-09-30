import { describe, expect, it } from "vitest";
import { minutesFromTime } from "@/lib/availability/time";
import { getClientStats, groupBookingsByClient, percentOf, rankClients } from "@/lib/clients/clientSegments";
import { createDefaultAppData } from "@/lib/data/defaultData";
import { buildDemoData, DEMO_CLIENTS } from "@/lib/demo/demoData";
import { clinicToday } from "@/lib/time/clinicTime";

// 10:30 in Yerevan on a Wednesday.
const NOW = new Date("2026-09-30T06:30:00.000Z");
const today = clinicToday(NOW);
const { data, photoFiles } = buildDemoData(createDefaultAppData(), NOW);

describe("demo data", () => {
  it("has 30 made-up clients with the +37477000001...030 phones", () => {
    expect(data.clients).toHaveLength(30);
    expect(data.clients.map((client) => client.normalizedPhone)).toEqual(
      Array.from({ length: 30 }, (_, index) => `+37477${String(index + 1).padStart(6, "0")}`)
    );
    expect(new Set(data.clients.map((client) => client.preferredChannel)).size).toBe(4);
    // Mostly Armenian names, 5-6 Russian ones, some in Latin or Cyrillic script.
    const russian = DEMO_CLIENTS.filter((seed) =>
      ["Ольга", "Елена", "Анна", "Irina", "Наталья", "Лусине"].includes(seed.firstName)
    );
    expect(russian.length).toBeGreaterThanOrEqual(5);
    expect(data.clients.some((client) => /[a-z]/i.test(client.fullName))).toBe(true);
    expect(data.clients.some((client) => /[а-я]/i.test(client.fullName))).toBe(true);
  });

  it("is deterministic for the same moment", () => {
    expect(buildDemoData(createDefaultAppData(), NOW).data).toEqual(data);
  });

  it("covers three months back and two weeks ahead with every status", () => {
    const dates = data.bookings.map((booking) => booking.date).sort();
    expect(dates[0] >= "2026-06-29").toBe(true);
    expect(dates.at(-1)! <= "2026-10-13").toBe(true);
    const statuses = new Set(data.bookings.map((booking) => booking.status));
    for (const status of ["pending", "confirmed", "completed", "cancelled", "no_show", "reschedule_requested"]) {
      expect(statuses).toContain(status);
    }
    // Nothing in the past is still waiting for an answer.
    expect(
      data.bookings.filter((booking) => booking.date < today && ["pending", "confirmed", "reschedule_requested"].includes(booking.status))
    ).toEqual([]);
  });

  it("never double-books and stays inside working hours, breaks and blocked times", () => {
    const byDate = new Map<string, typeof data.bookings>();
    for (const booking of data.bookings) {
      byDate.set(booking.date, [...(byDate.get(booking.date) ?? []), booking]);
    }

    for (const [date, list] of byDate) {
      const day = data.workingHours.find((item) => item.dayOfWeek === new Date(`${date}T00:00:00Z`).getUTCDay())!;
      expect(day.enabled).toBe(true);
      const cuts = [...day.breaks, ...data.blockedTimes.filter((item) => item.date === date)];
      const intervals = list
        .map((booking) => [minutesFromTime(booking.startTime), minutesFromTime(booking.endTime)])
        .sort((a, b) => a[0] - b[0]);

      intervals.forEach(([start, end], index) => {
        expect(start).toBeGreaterThanOrEqual(minutesFromTime(day.startTime));
        expect(end).toBeLessThanOrEqual(minutesFromTime(day.endTime));
        if (index > 0) {
          expect(start).toBeGreaterThanOrEqual(intervals[index - 1][1]);
        }
        for (const cut of cuts) {
          const overlaps = start < minutesFromTime(cut.endTime) && minutesFromTime(cut.startTime) < end;
          expect(overlaps).toBe(false);
        }
      });
    }
  });

  it("visit counters match the completed bookings", () => {
    for (const client of data.clients) {
      const completed = data.bookings.filter(
        (booking) => booking.clientId === client.id && booking.status === "completed"
      );
      expect(client.visitsCount).toBeGreaterThanOrEqual(completed.length);
      for (const booking of completed) {
        expect(client.lastVisitDate! >= booking.date).toBe(true);
      }
    }
  });

  it("has every segment, VIPs and a blacklist; segment percentages add up to 100", () => {
    const grouped = groupBookingsByClient(data.clients, data.bookings);
    const stats = data.clients.map((client) => getClientStats(client, grouped.get(client.id) ?? [], today));
    const counts = { active: 0, sleeping: 0, lost: 0, new: 0 };
    stats.forEach((item) => {
      counts[item.segment] += 1;
    });

    expect(counts.active).toBeGreaterThan(10);
    expect(counts.sleeping).toBeGreaterThanOrEqual(3);
    expect(counts.lost).toBeGreaterThanOrEqual(1);
    expect(counts.new).toBeGreaterThanOrEqual(3);
    expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBe(30);
    expect(stats.filter((item) => item.isVip).length).toBeGreaterThanOrEqual(2);
    expect(stats.filter((item) => item.isBlacklisted).length).toBeGreaterThanOrEqual(1);
    const percents = Object.values(counts).map((value) => percentOf(value, 30));
    expect(Math.abs(percents.reduce((sum, value) => sum + value, 0) - 100)).toBeLessThanOrEqual(2);
  });

  it("puts the frequent VIP clients at the top of the rating", () => {
    const ranked = rankClients(data.clients, groupBookingsByClient(data.clients, data.bookings), today);
    const topProfiles = ranked
      .slice(0, 4)
      .map((entry) => DEMO_CLIENTS[data.clients.indexOf(entry.client)].profile);
    expect(topProfiles).toEqual(["vip", "vip", "vip", "vip"]);
    expect(ranked.some((entry) => entry.stats.isBlacklisted)).toBe(false);
  });

  it("has notes, procedures, photos and messages in every channel", () => {
    expect(data.clientNotes.length).toBeGreaterThan(10);
    expect(data.clientProcedureRecords.length).toBeGreaterThan(20);
    expect(data.clientPhotos).toHaveLength(photoFiles.length);
    expect(new Set(data.smsQueue.map((item) => item.channel)).size).toBe(4);
    expect(new Set(data.smsLogs.map((log) => log.status))).toEqual(new Set(["sent", "failed", "skipped"]));
    // Scheduled messages are only in the future, so nothing goes out on start.
    for (const item of data.smsQueue.filter((entry) => entry.status === "scheduled")) {
      expect(Date.parse(item.scheduledAt)).toBeGreaterThan(NOW.getTime());
    }
  });
});
