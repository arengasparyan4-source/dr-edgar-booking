import { formatNumber } from "@/lib/i18n/formatDate";

export {
  formatDayMonth as formatCompactDate,
  formatLongDate as formatDateTitle,
  formatMonthYear as formatMonth,
  formatWeekdayShort
} from "@/lib/i18n/formatDate";

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getMonthDays = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() - startOffset + index);
    return date;
  });
};

export const getWeekDays = (date: Date) => {
  const start = new Date(date);
  const startOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - startOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

export const getMonthRange = (date: Date) => {
  const days = getMonthDays(date);
  return {
    from: toDateKey(days[0]),
    to: toDateKey(days[days.length - 1])
  };
};

export const formatMoney = (value: number, amd: string) =>
  `${formatNumber(value)} ${amd}`;
