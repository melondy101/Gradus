import type { WeekSubtaskLike } from "./week-progress";

export const MS_PER_DAY = 86_400_000;

export function startOfWeek(now: Date = new Date()): number {
  const d = new Date(now);
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDate(value?: Date | string | number | null): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function plannedStart(subtask: WeekSubtaskLike): number | null {
  const base = toDate(subtask.taskStartDate);
  if (!base) return null;
  const offset = Number.isFinite(subtask.startDay ?? NaN) ? subtask.startDay as number : 0;
  return base.getTime() + offset * MS_PER_DAY;
}

export function isWithinWeek(subtask: WeekSubtaskLike, weekStart = startOfWeek()): boolean {
  const weekEnd = weekStart + 7 * MS_PER_DAY;
  const completed = toDate(subtask.completedAt)?.getTime();
  if (completed !== undefined && completed >= weekStart && completed < weekEnd) return true;
  const start = plannedStart(subtask);
  if (start === null) return false;
  const days = Number.isFinite(subtask.durationDays ?? NaN) && (subtask.durationDays as number) > 0
    ? subtask.durationDays as number : 1;
  return start < weekEnd && start + days * MS_PER_DAY > weekStart;
}
