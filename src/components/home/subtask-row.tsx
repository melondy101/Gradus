// ─── 子任务日期换算（今日列表 / 时间轴 / 详情弹窗共用）─────────────────────
// ⚠ 这里只有纯函数：原 <SubtaskRow /> 组件已被 .subs / .sub 行与 TimelineCard 取代，
//   两个日期换算 helper 仍是 home-page、timeline-card、subtask-detail-modal 的实导入。

import type { SubtaskWithTask } from "@/lib/api/tasks";

/** 「7/12 - 7/15」形式的排期区间；任务没有开始日期时返回 null */
export function getSubtaskDateRange(row: SubtaskWithTask): string | null {
  const dates = getSubtaskActualDates(row);
  if (!dates) return null;
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return dates.start.getTime() === dates.end.getTime()
    ? fmt(dates.start)
    : `${fmt(dates.start)} - ${fmt(dates.end)}`;
}

/** 子任务落在日历上的真实起止日期（大任务 startDate + startDay + durationDays） */
export function getSubtaskActualDates(row: SubtaskWithTask): { start: Date; end: Date } | null {
  if (!row.taskStartDate) return null;
  const base = new Date(row.taskStartDate);
  if (isNaN(base.getTime())) return null;
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const start = new Date(baseDay);
  start.setDate(baseDay.getDate() + row.startDay);
  const end = new Date(baseDay);
  end.setDate(baseDay.getDate() + row.startDay + row.durationDays - 1);
  return { start, end };
}

/** 该子任务是否落在指定那一天（今日分桶判定，与 §9 全局排期口径一致） */
export function isSubtaskOnDay(row: SubtaskWithTask, day: Date): boolean {
  const dates = getSubtaskActualDates(row);
  if (!dates) return true; // 无排期信息的子任务默认算「今天要做」
  return dates.start <= day && day <= dates.end;
}
