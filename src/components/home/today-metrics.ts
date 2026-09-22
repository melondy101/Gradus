// ─── 屏一统计口径（全部来自真实 subtaskRows，不做任何估算）──────────────────
// 设计稿的「最近截止 / 共 N 项 / 4.5 小时」在真实数据里分别是：
//   最近截止 = 未完成子任务里最早的一天
//   共 N 项  = 今日时间桶内的子任务总数
//   N 小时   = 今日子任务深度工时合计（无 deepWorkHours 时按 1.5h/天 折算，与旧卡片同口径）

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { getSubtaskActualDates } from "./subtask-row";

export interface TodayMetrics {
  todayTotal: number;
  todayPending: number;
  todayHours: number;
  /** 「最近截止 09-24」；没有任何未完成子任务时为 null（此时脚注显示已完成） */
  nextDeadline: string | null;
  pendingTotal: number;
  completedTotal: number;
}

function hoursOf(row: SubtaskWithTask): number {
  const deep = row.deepWorkHours ? Number(row.deepWorkHours) : 0;
  return deep > 0 ? deep : (row.durationDays || 1) * 1.5;
}

export function computeTodayMetrics(
  todayRows: SubtaskWithTask[],
  allRows: SubtaskWithTask[],
  today: Date
): TodayMetrics {
  const pending = allRows.filter((r) => !r.completed);
  let earliest: Date | null = null;
  for (const r of pending) {
    const dates = getSubtaskActualDates(r);
    if (!dates) continue;
    const end = dates.end < today ? today : dates.end;
    if (!earliest || end < earliest) earliest = end;
  }

  return {
    todayTotal: todayRows.length,
    todayPending: todayRows.filter((r) => !r.completed).length,
    todayHours: Math.round(todayRows.reduce((n, r) => n + hoursOf(r), 0) * 10) / 10,
    nextDeadline: earliest
      ? `${String(earliest.getMonth() + 1).padStart(2, "0")}-${String(earliest.getDate()).padStart(2, "0")}`
      : null,
    pendingTotal: pending.length,
    completedTotal: allRows.length - pending.length,
  };
}
