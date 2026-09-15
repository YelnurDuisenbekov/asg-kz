import type { Deadline, DeadlineMode } from "./types";

export function todayIso() {
  const d = new Date();
  return toIso(d);
}

export function toIso(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseIso(iso?: string) {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addCalendarDays(from: Date, days: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function addWorkingDays(from: Date, days: number) {
  const d = new Date(from);
  let left = Math.max(0, days);
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left -= 1;
  }
  return d;
}

export function dueDate(deadline?: Deadline | null): Date | null {
  if (!deadline) return null;
  if (deadline.mode === "DATE") return parseIso(deadline.date);
  const from = parseIso(deadline.from) ?? new Date();
  const days = Number(deadline.days) || 0;
  if (deadline.mode === "WORKING_DAYS") return addWorkingDays(from, days);
  return addCalendarDays(from, days);
}

export function parseDeadline(form: FormData, prefix: string): Deadline {
  const mode = (String(form.get(`${prefix}Mode`) ?? "DATE") as DeadlineMode);
  const from = todayIso();
  if (mode === "DATE") {
    return { mode, date: String(form.get(`${prefix}Date`) ?? "").trim() || undefined, from };
  }
  const days = Number(String(form.get(`${prefix}Days`) ?? "").replace(",", "."));
  return {
    mode: mode === "WORKING_DAYS" ? "WORKING_DAYS" : "CALENDAR_DAYS",
    days: Number.isFinite(days) ? days : 0,
    from,
  };
}
