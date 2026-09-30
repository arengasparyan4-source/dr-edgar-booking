import type { Language } from "@/data/translations";

/**
 * Date formatting in the interface language.
 *
 * Browsers do not reliably ship Armenian locale data: Chromium formats
 * "hy-AM" dates with Russian month names. Armenian is therefore formatted
 * from the tables below; Russian and English use Intl.
 */

const intlLocale: Record<Exclude<Language, "hy">, string> = {
  ru: "ru-RU",
  en: "en-GB"
};

const hyMonths = [
  "հունվար", "փետրվար", "մարտ", "ապրիլ", "մայիս", "հունիս",
  "հուլիս", "օգոստոս", "սեպտեմբեր", "հոկտեմբեր", "նոյեմբեր", "դեկտեմբեր"
];
// "29 սեպտեմբերի" - the day-month form uses the genitive.
const hyMonthsGenitive = hyMonths.map((month) => `${month}ի`);
const hyMonthsShort = [
  "հնվ", "փտվ", "մրտ", "ապր", "մյս", "հնս", "հլս", "օգս", "սեպ", "հոկ", "նոյ", "դեկ"
];
const hyWeekdays = [
  "կիրակի", "երկուշաբթի", "երեքշաբթի", "չորեքշաբթի", "հինգշաբթի", "ուրբաթ", "շաբաթ"
];
const hyWeekdaysShort = ["կիր", "երկ", "երք", "չրք", "հնգ", "ուրբ", "շբթ"];

const capitalize = (value: string) =>
  value ? value[0].toLocaleUpperCase() + value.slice(1) : value;

/** "2026-09-29" -> local Date at midnight; anything else goes through Date. */
export const toDate = (value: Date | string): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const dateKey = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateKey
    ? new Date(Number(dateKey[1]), Number(dateKey[2]) - 1, Number(dateKey[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const intl = (language: Exclude<Language, "hy">, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale[language], options);

/** "Սեպտեմբեր 2026" / "сентябрь 2026 г." / "September 2026" */
export function formatMonthYear(value: Date | string, language: Language) {
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return `${capitalize(hyMonths[date.getMonth()])} ${date.getFullYear()}`;
  }
  return capitalize(intl(language, { month: "long", year: "numeric" }).format(date));
}

/** "Երեքշաբթի, 29 սեպտեմբերի 2026" / "вторник, 29 сентября 2026 г." / "Tuesday, 29 September 2026" */
export function formatLongDate(value: Date | string, language: Language) {
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return `${capitalize(hyWeekdays[date.getDay()])}, ${date.getDate()} ${hyMonthsGenitive[date.getMonth()]} ${date.getFullYear()}`;
  }
  return capitalize(
    intl(language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date)
  );
}

/** "29 սեպ" / "29 сент." / "29 Sept" */
export function formatDayMonth(value: Date | string, language: Language) {
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return `${date.getDate()} ${hyMonthsShort[date.getMonth()]}`;
  }
  return intl(language, { day: "numeric", month: "short" }).format(date);
}

/** "29 սեպ 2026" / "29 сент. 2026 г." / "29 Sept 2026" - for tables and cards. */
export function formatDate(value: Date | string | undefined | null, language: Language) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return `${date.getDate()} ${hyMonthsShort[date.getMonth()]} ${date.getFullYear()}`;
  }
  return intl(language, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Date and time of an instant (e.g. createdAt), in the browser's zone. */
export function formatDateTime(value: string | undefined | null, language: Language) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return String(value);
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${formatDate(date, language)}, ${time}`;
}

/** "երք" / "вт" / "Tue" */
export function formatWeekdayShort(value: Date | string, language: Language) {
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return hyWeekdaysShort[date.getDay()];
  }
  return intl(language, { weekday: "short" }).format(date);
}

/** "սեպ" / "сент." / "Sept" */
export function formatMonthShort(value: Date | string, language: Language) {
  const date = toDate(value);
  if (!date) return String(value);
  if (language === "hy") {
    return hyMonthsShort[date.getMonth()];
  }
  return intl(language, { month: "short" }).format(date);
}

/** Numbers grouped with a plain space, the same in every language: 15 000. */
export const formatNumber = (value: number) =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
