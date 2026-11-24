import { diffDays } from "@/lib/dates";

const MIN_VISIBLE_DAYS = 14;

/**
 * 14 天可视窗口：短计划补齐到 14 列（原型一屏的密度），
 * 长计划按真实跨度渲染、由容器横向滚动，不裁切任何排期。
 */
export function getTimelineDayCount(windowStart: Date, windowEnd: Date): number {
  return Math.max(diffDays(windowStart, windowEnd) + 1, MIN_VISIBLE_DAYS);
}
