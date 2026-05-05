import { PeriodRange } from "../types";

export function startOfDay(date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date = new Date()): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date = new Date()): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;
  return addDays(start, -daysSinceMonday);
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function todayRange(date = new Date()): PeriodRange {
  return {
    label: "Today",
    from: startOfDay(date),
    to: endOfDay(date),
  };
}

export function weekRange(date = new Date()): PeriodRange {
  const from = startOfWeek(date);
  return {
    label: "This week",
    from,
    to: endOfDay(addDays(from, 6)),
  };
}

export function previousWeekRange(date = new Date()): PeriodRange {
  const currentStart = startOfWeek(date);
  const from = addDays(currentStart, -7);
  return {
    label: "Previous week",
    from,
    to: endOfDay(addDays(from, 6)),
  };
}

export function monthRange(date = new Date()): PeriodRange {
  const from = startOfMonth(date);
  return {
    label: "This month",
    from,
    to: endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}
