/**
 * Synthetic data for the browser tests. No real clients: every name and
 * phone number below is made up. Dates are computed from "now" in the clinic
 * zone so the tests work on any day.
 */
export const E2E_PORT = 3210;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_ADMIN_PASSWORD = "e2e-admin-password";
const zone = "Asia/Yerevan";

const consultation = {
  id: "consultation-primary",
  category: "consultation",
  durationMinutes: 30,
  price: 15000,
  active: true,
  name: {
    hy: "Կոսմետոլոգիական խորհրդատվություն",
    ru: "Консультация косметолога",
    en: "Cosmetology consultation"
  },
  description: {
    hy: "Անհատական խորհրդատվություն",
    ru: "Индивидуальная консультация",
    en: "Personal consultation"
  }
};

/** Clinic calendar date `offsetDays` from today, as YYYY-MM-DD. */
export const clinicDate = (now, offsetDays = 0) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  const [y, m, d] = parts.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return date.toISOString().slice(0, 10);
};

const weekday = (dateKey) => new Date(`${dateKey}T00:00:00Z`).getUTCDay();

/** First Monday-Friday date at least `minOffset` days ahead. */
export const nextWeekday = (now, minOffset) => {
  for (let offset = minOffset; offset < minOffset + 7; offset += 1) {
    const date = clinicDate(now, offset);
    if (weekday(date) >= 1 && weekday(date) <= 5) {
      return date;
    }
  }
  throw new Error("unreachable");
};

export const SEED = {
  clients: {
    aram: { id: "client_e2e_aram", fullName: "Արամ Խաչատրյան", phone: "+37491123456" },
    maria: { id: "client_e2e_maria", fullName: "Мария Иванова", phone: "+37499111222" },
    anna: { id: "client_e2e_anna", fullName: "Anna Petrosyan", phone: "+37477000111" }
  },
  bookings: {
    pending: "booking_e2e_pending",
    toCancel: "booking_e2e_to_cancel",
    past: "booking_e2e_past"
  }
};

const client = ({ id, fullName, phone }, extra = {}) => {
  const [firstName, ...rest] = fullName.split(" ");
  return {
    id,
    fullName,
    firstName,
    lastName: rest.join(" "),
    phone,
    normalizedPhone: phone,
    status: "active",
    isVip: false,
    isBlacklisted: false,
    source: "e2e",
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
    ...extra
  };
};

const booking = (id, who, date, startTime, endTime, status) => {
  const [firstName, ...rest] = who.fullName.split(" ");
  return {
    id,
    clientId: who.id,
    firstName,
    lastName: rest.join(" "),
    phone: who.phone,
    selectedServiceIds: [consultation.id],
    servicesSnapshot: [consultation],
    totalDurationMinutes: 30,
    totalPrice: consultation.price,
    date,
    startTime,
    endTime,
    status,
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-10T10:00:00.000Z",
    ...(status === "confirmed" ? { confirmedAt: "2026-01-10T10:00:00.000Z" } : {})
  };
};

export function buildSeedData(now) {
  const future = nextWeekday(now, 2);
  const past = clinicDate(now, -3);
  const { aram, maria, anna } = SEED.clients;

  return {
    // Empty services / workingHours / portfolio / settings are filled with
    // the app's defaults on load.
    services: [],
    workingHours: [],
    // Beyond the booking horizon, so it never changes the offered slots; only
    // used to check that the reason is not published.
    blockedTimes: [
      {
        id: "blocked_e2e_private",
        date: clinicDate(now, 40),
        startTime: "10:00",
        endTime: "12:00",
        reason: "Private e2e reason"
      }
    ],
    portfolio: [],
    clients: [
      client(aram, { visitsCount: 2, lastVisitDate: clinicDate(now, -40) }),
      client(maria),
      client(anna)
    ],
    bookings: [
      booking(SEED.bookings.pending, aram, future, "11:00", "11:30", "pending"),
      booking(SEED.bookings.toCancel, maria, future, "15:00", "15:30", "confirmed"),
      // Confirmed and already over: auto-completed when the server starts.
      booking(SEED.bookings.past, anna, past, "10:00", "10:30", "confirmed")
    ],
    clientProcedureRecords: [],
    clientNotes: [],
    clientPhotos: [],
    smsQueue: [],
    smsLogs: []
  };
}
