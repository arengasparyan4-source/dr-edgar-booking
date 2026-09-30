import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createDefaultAppData } from "@/lib/data/defaultData";
import { clinicToday, toUtcIso } from "@/lib/time/clinicTime";
import type {
  AppData,
  BlockedTime,
  Booking,
  BookingStatus,
  PortfolioItem,
  Service,
  Settings,
  WorkingHours
} from "@/types/domain";

const dataDirectory = path.join(process.cwd(), "storage");
const dataPath = path.join(dataDirectory, "app-data.json");

export const SERVICE_IN_USE = "Service is used by upcoming bookings";
const activeBookingStatuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "reschedule_requested"
];

let memoryCache: AppData | null = null;
let updateQueue: Promise<unknown> = Promise.resolve();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const containsMojibake = (value: unknown): boolean => {
  if (typeof value === "string") {
    return /[ÐÑÕÖÂ]/.test(value);
  }

  if (Array.isArray(value)) {
    return value.some(containsMojibake);
  }

  if (value && typeof value === "object") {
    return Object.values(value).some(containsMojibake);
  }

  return false;
};

const mergeWithDefaults = (data: Partial<AppData>): AppData => {
  const defaults = createDefaultAppData();
  const useDefaultServices = !data.services?.length || containsMojibake(data.services);
  const useDefaultPortfolio = !data.portfolio?.length || containsMojibake(data.portfolio);
  const settings = containsMojibake(data.settings)
    ? defaults.settings
    : { ...defaults.settings, ...(data.settings ?? {}) };

  return {
    services: useDefaultServices ? defaults.services : data.services!,
    bookings: data.bookings ?? defaults.bookings,
    // Clients, queue items and logs created before message channels existed
    // get "sms" (idempotent, persisted on the next write).
    clients: (data.clients ?? defaults.clients).map((client) =>
      client.preferredChannel ? client : { ...client, preferredChannel: "sms" }
    ),
    clientProcedureRecords:
      data.clientProcedureRecords ?? defaults.clientProcedureRecords,
    clientNotes: data.clientNotes ?? defaults.clientNotes,
    clientPhotos: data.clientPhotos ?? defaults.clientPhotos,
    workingHours: data.workingHours?.length
      ? data.workingHours
      : defaults.workingHours,
    blockedTimes: data.blockedTimes ?? defaults.blockedTimes,
    portfolio: useDefaultPortfolio ? defaults.portfolio : data.portfolio!,
    settings,
    // SMS collections must be listed explicitly here, otherwise they would be
    // dropped on every write. Templates fall back to defaults only when empty.
    smsTemplates: data.smsTemplates?.length
      ? data.smsTemplates
      : defaults.smsTemplates,
    // scheduledAt is compared as a string with "now" in UTC ISO, so every
    // value must be UTC ISO; older zone-less reminder times are migrated here
    // (idempotent, persisted on the next write).
    smsQueue: (data.smsQueue ?? defaults.smsQueue).map((item) => ({
      ...item,
      scheduledAt: toUtcIso(item.scheduledAt),
      channel: item.channel ?? "sms"
    })),
    smsLogs: (data.smsLogs ?? defaults.smsLogs).map((log) =>
      log.channel ? log : { ...log, channel: "sms" }
    )
  };
};

async function readData(): Promise<AppData> {
  if (memoryCache) {
    return clone(memoryCache);
  }

  try {
    const raw = await readFile(dataPath, "utf-8");
    memoryCache = mergeWithDefaults(JSON.parse(raw) as Partial<AppData>);
  } catch {
    memoryCache = createDefaultAppData();
    await writeData(memoryCache);
  }

  return clone(memoryCache);
}

async function writeData(data: AppData) {
  memoryCache = clone(data);
  await mkdir(dataDirectory, { recursive: true });
  const tempPath = path.join(dataDirectory, `app-data.${randomUUID()}.tmp`);
  await writeFile(tempPath, JSON.stringify(memoryCache, null, 2), "utf-8");
  await rename(tempPath, dataPath);
}

async function updateData(updater: (data: AppData) => AppData | Promise<AppData>) {
  const runUpdate = async () => {
    const current = await readData();
    const next = await updater(current);
    await writeData(mergeWithDefaults(next));
    return readData();
  };
  const result = updateQueue.then(runUpdate, runUpdate);
  updateQueue = result.catch(() => undefined);
  return result;
}

export const appRepository = {
  getData: readData,
  updateData,

  async getPublicSiteData() {
    const data = await readData();

    return {
      services: data.services.filter((service) => service.active),
      workingHours: data.workingHours,
      // Only when the doctor is away, never why: `reason` is private.
      blockedTimes: data.blockedTimes.map(({ id, date, startTime, endTime }) => ({
        id,
        date,
        startTime,
        endTime
      })),
      portfolio: data.portfolio
        .filter((item) => item.active)
        .sort((a, b) => a.order - b.order),
      settings: {
        address: data.settings.address,
        phone: data.settings.phone,
        instagramUrl: data.settings.instagramUrl,
        bookingHorizonDays: data.settings.bookingHorizonDays,
        aboutDoctor: data.settings.aboutDoctor
      },
      today: clinicToday()
    };
  },

  async listServices(includeInactive = true) {
    const data = await readData();
    return includeInactive
      ? data.services
      : data.services.filter((service) => service.active);
  },

  async upsertService(service: Service) {
    return updateData((data) => ({
      ...data,
      services: data.services.some((item) => item.id === service.id)
        ? data.services.map((item) => (item.id === service.id ? service : item))
        : [...data.services, service]
    }));
  },

  /**
   * Refuses while the service is part of an upcoming active booking (the
   * doctor should cancel/move those first, or just deactivate the service).
   * Checked inside the write so a booking made meanwhile is not missed.
   */
  async deleteService(serviceId: string) {
    return updateData((data) => {
      const today = clinicToday();
      const inUse = data.bookings.some(
        (booking) =>
          booking.date >= today &&
          activeBookingStatuses.includes(booking.status) &&
          booking.selectedServiceIds.includes(serviceId)
      );

      if (inUse) {
        throw new Error(SERVICE_IN_USE);
      }

      return {
        ...data,
        services: data.services.filter((service) => service.id !== serviceId)
      };
    });
  },

  async listBookings() {
    const data = await readData();
    return data.bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getBooking(bookingId: string) {
    const data = await readData();
    return data.bookings.find((booking) => booking.id === bookingId) ?? null;
  },

  async saveBooking(booking: Booking) {
    return updateData((data) => ({
      ...data,
      bookings: data.bookings.some((item) => item.id === booking.id)
        ? data.bookings.map((item) => (item.id === booking.id ? booking : item))
        : [booking, ...data.bookings]
    }));
  },

  async updateBooking(bookingId: string, patch: Partial<Booking>) {
    let updatedBooking: Booking | null = null;
    await updateData((data) => ({
      ...data,
      bookings: data.bookings.map((booking) => {
        if (booking.id !== bookingId) {
          return booking;
        }

        updatedBooking = {
          ...booking,
          ...patch,
          updatedAt: new Date().toISOString()
        };
        return updatedBooking;
      })
    }));

    return updatedBooking;
  },

  async updateSchedule(workingHours: WorkingHours[], blockedTimes: BlockedTime[]) {
    return updateData((data) => ({
      ...data,
      workingHours,
      blockedTimes
    }));
  },

  async updatePortfolio(portfolio: PortfolioItem[]) {
    return updateData((data) => ({
      ...data,
      portfolio
    }));
  },

  async updateSettings(settings: Partial<Settings>) {
    return updateData((data) => ({
      ...data,
      settings: { ...data.settings, ...settings }
    }));
  }
};
