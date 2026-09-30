/**
 * Clinic time zone helpers.
 *
 * Every schedule value in storage (booking date/startTime/endTime, working
 * hours, blocked times) is wall-clock time in the clinic's zone. Anything that
 * comes from or goes to the outside world as an instant (Google Calendar,
 * `Date.now()`) is converted here, through Intl only, so the server's own zone
 * never leaks into scheduling decisions.
 */

export const DEFAULT_CLINIC_TIMEZONE = "Asia/Yerevan";

export type ClinicDateTime = {
  /** YYYY-MM-DD in the clinic zone. */
  date: string;
  /** HH:MM (00:00-23:59) in the clinic zone. */
  time: string;
  /** Minutes since clinic midnight, 0-1439. */
  minutes: number;
};

const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
};

let warnedAboutInvalidZone = false;

export function getClinicTimeZone(): string {
  const configured = (process.env.CLINIC_TIMEZONE ?? "").trim();

  if (!configured) {
    return DEFAULT_CLINIC_TIMEZONE;
  }

  if (!isValidTimeZone(configured)) {
    if (!warnedAboutInvalidZone) {
      warnedAboutInvalidZone = true;
      console.warn(
        `[clinicTime] CLINIC_TIMEZONE="${configured}" is not a valid IANA zone; using ${DEFAULT_CLINIC_TIMEZONE}`
      );
    }
    return DEFAULT_CLINIC_TIMEZONE;
  }

  return configured;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string) => {
  let formatter = formatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    formatterCache.set(timeZone, formatter);
  }

  return formatter;
};

const pad = (value: number) => String(value).padStart(2, "0");

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {};

  for (const part of getFormatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    // Some engines still print 24 for midnight even with h23.
    hour: parts.hour === 24 ? 0 : parts.hour,
    minute: parts.minute,
    second: parts.second
  };
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (Yerevan: +240). */
export function getTimeZoneOffsetMinutes(
  instant: Date,
  timeZone: string = getClinicTimeZone()
): number {
  const parts = getZonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const wholeSeconds = Math.floor(instant.getTime() / 1000) * 1000;

  return Math.round((asUtc - wholeSeconds) / 60000);
}

/** Converts an instant (Date or RFC3339 string) to clinic wall-clock time. */
export function utcToClinic(
  instant: Date | string,
  timeZone: string = getClinicTimeZone()
): ClinicDateTime {
  const value = typeof instant === "string" ? new Date(instant) : instant;

  if (Number.isNaN(value.getTime())) {
    throw new Error(`Invalid instant: ${String(instant)}`);
  }

  const parts = getZonedParts(value, timeZone);

  return {
    date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
    time: `${pad(parts.hour)}:${pad(parts.minute)}`,
    minutes: parts.hour * 60 + parts.minute
  };
}

/**
 * Converts clinic wall-clock time to the matching instant. For wall times that
 * do not exist or repeat around a DST switch the earlier offset wins; Armenia
 * has no DST, so this only matters if CLINIC_TIMEZONE is changed.
 */
export function clinicToUtc(
  date: string,
  time: string,
  timeZone: string = getClinicTimeZone()
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hours, minutes);

  if (Number.isNaN(wallAsUtc)) {
    throw new Error(`Invalid clinic date/time: ${date} ${time}`);
  }

  let result = wallAsUtc - getTimeZoneOffsetMinutes(new Date(wallAsUtc), timeZone) * 60000;
  const correctedOffset = getTimeZoneOffsetMinutes(new Date(result), timeZone);
  result = wallAsUtc - correctedOffset * 60000;

  return new Date(result);
}

/** "+04:00"-style offset of the clinic zone at the given wall-clock time. */
export function clinicOffsetString(
  date: string,
  time: string,
  timeZone: string = getClinicTimeZone()
): string {
  const offset = getTimeZoneOffsetMinutes(clinicToUtc(date, time, timeZone), timeZone);
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);

  return `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`;
}

/** RFC3339 local date-time with the clinic offset, e.g. 2026-09-29T10:00:00+04:00. */
export function toClinicRfc3339(
  date: string,
  time: string,
  timeZone: string = getClinicTimeZone()
): string {
  return `${date}T${time}:00${clinicOffsetString(date, time, timeZone)}`;
}

const localDateTimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/;

/**
 * Normalizes a stored instant to UTC ISO (`...Z`). Values with a zone
 * (`Z`/`+04:00`) are converted as they are; zone-less values such as
 * `2026-07-24T09:00:00` (old SMS reminders) are read as clinic wall-clock
 * time. Anything unparseable is returned unchanged.
 */
export function toUtcIso(value: string): string {
  const local = localDateTimePattern.exec(value);

  if (local) {
    try {
      return clinicToUtc(local[1], local[2]).toISOString();
    } catch {
      return value;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

/** Current clinic wall-clock time. `now` is injectable for tests. */
export function nowInClinic(
  now: Date = new Date(),
  timeZone: string = getClinicTimeZone()
): ClinicDateTime {
  return utcToClinic(now, timeZone);
}

/** Today's date (YYYY-MM-DD) in the clinic zone. */
export function clinicToday(now: Date = new Date()): string {
  return nowInClinic(now).date;
}
