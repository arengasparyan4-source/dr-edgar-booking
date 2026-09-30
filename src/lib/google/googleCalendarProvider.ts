import { createSign } from "node:crypto";
import type { Booking, Settings, TimeSlot } from "@/types/domain";
import { addDays } from "@/lib/availability/time";
import {
  clinicToUtc,
  getClinicTimeZone,
  toClinicRfc3339
} from "@/lib/time/clinicTime";
import { freeBusyToClinicSlots } from "./freeBusy";

type CalendarEventInput = Booking;

export type GoogleCalendarProvider = {
  getBusyEvents(dateFrom: string, dateTo: string): Promise<TimeSlot[]>;
  createCalendarEvent(booking: CalendarEventInput): Promise<string | undefined>;
  deleteCalendarEvent(eventId: string): Promise<void>;
  updateCalendarEvent(eventId: string, data: Partial<CalendarEventInput>): Promise<void>;
};

const calendarScope = "https://www.googleapis.com/auth/calendar";
const calendarBaseUrl = "https://www.googleapis.com/calendar/v3";

const base64Url = (input: string | Buffer) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const getGoogleConfig = (settings: Settings) => ({
  enabled:
    process.env.GOOGLE_CALENDAR_ENABLED === "true" ||
    settings.googleCalendarEnabled,
  calendarId:
    process.env.GOOGLE_CALENDAR_ID || settings.googleCalendarId || "",
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
  privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
});

async function getAccessToken(clientEmail: string, privateKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: calendarScope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) {
    throw new Error(`Google auth failed: ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// Booking times are clinic wall-clock times; the offset comes from
// CLINIC_TIMEZONE instead of a hard-coded +04:00.
const toDateTime = (date: string, time: string) => toClinicRfc3339(date, time);

function getServiceList(booking: CalendarEventInput) {
  return booking.servicesSnapshot
    .map(
      (service) =>
        `- ${service.name.hy} / ${service.name.ru} (${service.durationMinutes} min, ${service.price} AMD)`
    )
    .join("\n");
}

function calendarEventBody(booking: CalendarEventInput) {
  const timeZone = getClinicTimeZone();

  return {
    summary: `Confirmed - Dr. Edgar - ${booking.firstName} ${booking.lastName}`,
    description: [
      `Հաճախորդ: ${booking.firstName} ${booking.lastName}`,
      `Հեռախոս: ${booking.phone}`,
      "Պրոցեդուրաներ:",
      getServiceList(booking),
      `Ընդհանուր տևողություն: ${booking.totalDurationMinutes} min`,
      `Ընդհանուր արժեք: ${booking.totalPrice} AMD`,
      `Մեկնաբանություն: ${booking.comment || "Չկա"}`
    ].join("\n"),
    start: {
      dateTime: toDateTime(booking.date, booking.startTime),
      timeZone
    },
    end: {
      dateTime: toDateTime(booking.date, booking.endTime),
      timeZone
    }
  };
}

function isFullCalendarEventInput(
  data: Partial<CalendarEventInput>
): data is CalendarEventInput {
  return Boolean(
    data.id &&
      data.firstName &&
      data.lastName &&
      data.phone &&
      data.date &&
      data.startTime &&
      data.endTime &&
      data.servicesSnapshot &&
      typeof data.totalDurationMinutes === "number" &&
      typeof data.totalPrice === "number"
  );
}

function createMockGoogleCalendarProvider(): GoogleCalendarProvider {
  return {
    async getBusyEvents() {
      return [];
    },
    async createCalendarEvent(booking) {
      const eventId = `mock_google_${booking.id}`;
      console.info("[MockGoogleCalendarProvider] createCalendarEvent", eventId);
      return eventId;
    },
    async deleteCalendarEvent(eventId) {
      console.info("[MockGoogleCalendarProvider] deleteCalendarEvent", eventId);
    },
    async updateCalendarEvent(eventId, data) {
      console.info("[MockGoogleCalendarProvider] updateCalendarEvent", eventId, data);
    }
  };
}

function createGoogleCalendarProvider(settings: Settings): GoogleCalendarProvider {
  const config = getGoogleConfig(settings);

  if (!config.enabled || !config.calendarId || !config.clientEmail || !config.privateKey) {
    return createMockGoogleCalendarProvider();
  }

  const authFetch = async (url: string, init: RequestInit = {}) => {
    const accessToken = await getAccessToken(config.clientEmail, config.privateKey);
    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {})
      }
    });
  };

  return {
    async getBusyEvents(dateFrom, dateTo) {
      const response = await authFetch(`${calendarBaseUrl}/freeBusy`, {
        method: "POST",
        body: JSON.stringify({
          // Whole clinic days [dateFrom 00:00, dateTo+1 00:00) as UTC instants.
          timeMin: clinicToUtc(dateFrom, "00:00").toISOString(),
          timeMax: clinicToUtc(addDays(dateTo, 1), "00:00").toISOString(),
          timeZone: getClinicTimeZone(),
          items: [{ id: config.calendarId }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google freeBusy failed: ${await response.text()}`);
      }

      const data = (await response.json()) as {
        calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
      };
      // freeBusy answers in UTC regardless of the requested timeZone; convert
      // to clinic wall-clock time and split events that cross midnight.
      return freeBusyToClinicSlots(
        data.calendars?.[config.calendarId]?.busy ?? []
      );
    },

    async createCalendarEvent(booking) {
      const response = await authFetch(
        `${calendarBaseUrl}/calendars/${encodeURIComponent(config.calendarId)}/events`,
        {
          method: "POST",
          body: JSON.stringify(calendarEventBody(booking))
        }
      );

      if (!response.ok) {
        throw new Error(`Google create event failed: ${await response.text()}`);
      }

      const data = (await response.json()) as { id?: string };
      return data.id;
    },

    async deleteCalendarEvent(eventId) {
      const response = await authFetch(
        `${calendarBaseUrl}/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "DELETE" }
      );

      if (!response.ok && response.status !== 410 && response.status !== 404) {
        throw new Error(`Google delete event failed: ${await response.text()}`);
      }
    },

    async updateCalendarEvent(eventId, data) {
      const response = await authFetch(
        `${calendarBaseUrl}/calendars/${encodeURIComponent(config.calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(
            isFullCalendarEventInput(data) ? calendarEventBody(data) : data
          )
        }
      );

      if (!response.ok) {
        throw new Error(`Google update event failed: ${await response.text()}`);
      }
    }
  };
}

export const getGoogleCalendarProvider = (settings: Settings) =>
  createGoogleCalendarProvider(settings);
