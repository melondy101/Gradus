/**
 * 任务日期工具 —— 屏二甘特窗口与子任务排期共用的日期格式化层。
 * toDate / addDays 本体已下沉到 src/lib/dates.ts（features store 也消费）。
 */

import { addDays, toDate } from "@/lib/dates";

export { addDays, toDate };

export function fmtShortDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export function fmtLongDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

/** 计划区间眉题：2026.09.10 → 2026.12.10；无起始日时退化为「N 天计划」。 */
export function planRangeLabel(
  startDate: string | Date | null | undefined,
  totalDays: number,
  fallbackDate?: string | Date | null
): string {
  const base = toDate(startDate) ?? toDate(fallbackDate);
  if (!base) return `${totalDays} 天计划`;
  return `${fmtLongDate(base)} → ${fmtLongDate(addDays(base, Math.max(totalDays - 1, 0)))}`;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function weekdayLabel(d: Date): string {
  return WEEKDAYS[d.getDay()];
}

/** 今天相对任务起始日的天偏移（可为负，表示计划尚未开始）。 */
export function todayOffsetOf(startDate: string | Date | null | undefined): number | null {
  const base = toDate(startDate);
  if (!base) return null;
  const a = addDays(base, 0);
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
