import { diffDays } from "@/lib/dates";

const MIN_VISIBLE_DAYS = 30;

/** 保留完整排期范围；短计划补齐至 30 天，长计划不截断。 */
export function getTimelineDayCount(windowStart: Date, windowEnd: Date): number {
  return Math.max(diffDays(windowStart, windowEnd) + 1, MIN_VISIBLE_DAYS);
}
