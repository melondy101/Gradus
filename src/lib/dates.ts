/**
 * 最小日期工具层 —— 供 features store 与组件层共用，避免跨层依赖。
 * 全部基于真实字段 task.startDate 与 subtask.startDay / durationDays。
 */

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 以「自然日」为粒度偏移，避免时区导致的一天漂移。 */
export function addDays(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** b - a 的自然日差（同一天为 0；b 早于 a 为负）。 */
export function diffDays(a: Date, b: Date): number {
  const a0 = addDays(a, 0).getTime();
  const b0 = addDays(b, 0).getTime();
  return Math.round((b0 - a0) / 86_400_000);
}
