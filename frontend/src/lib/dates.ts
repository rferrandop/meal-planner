import { startOfWeek, format } from "date-fns";
import { es } from "date-fns/locale";

export function getWeekStart(date: Date = new Date()): string {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return format(d, "EEEE d", { locale: es });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return format(d, "EEE d", { locale: es });
}

export function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart + "T12:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return format(d, "yyyy-MM-dd");
  });
}

export function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}
