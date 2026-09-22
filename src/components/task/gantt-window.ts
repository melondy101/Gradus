import { addDays, toDate, weekdayLabel } from "./task-dates";

/**
 * 甘特窗口计算 —— 设计稿固定 8 列网格（`.g__cols` / `.g__track` 均为 repeat(8)）。
 * 真实计划常超 8 天，因此把窗口对准「今天」（今天落在第 3 列），
 * 窗口外的条形只统计数量并写进 `.g__foot`，不做假装显示。
 */

export const GANTT_COLS = 8;

export interface GanttColumn {
  key: number;
  /** 相对任务起始日的偏移（0 起） */
  day: number;
  /** 表头文案：有起始日时为星期，否则为 D1/D2… */
  label: string;
  date: string;
  isToday: boolean;
  inPlan: boolean;
}

export interface GanttWindow {
  anchor: number;
  cols: GanttColumn[];
  /** 计划最后一天（相对起始日偏移） */
  spanEnd: number;
  hiddenBefore: number;
  hiddenAfter: number;
}

export interface GanttSpan {
  startDay: number;
  endDay: number;
}

export function planGanttWindow(
  spans: GanttSpan[],
  totalDays: number,
  startDate: string | Date | null | undefined,
  todayOffset: number | null
): GanttWindow {
  const spanEnd = spans.reduce((m, s) => Math.max(m, s.endDay), Math.max(totalDays - 1, 0));
  let anchor = 0;
  if (spanEnd + 1 > GANTT_COLS && todayOffset !== null) {
    anchor = Math.min(Math.max(todayOffset - 2, 0), Math.max(spanEnd - GANTT_COLS + 1, 0));
  }
  const base = toDate(startDate);

  const cols: GanttColumn[] = Array.from({ length: GANTT_COLS }, (_, i) => {
    const day = anchor + i;
    const date = base ? addDays(base, day) : null;
    return {
      key: day,
      day,
      label: date ? weekdayLabel(date) : `D${day + 1}`,
      date: date ? `${date.getMonth() + 1}/${date.getDate()}` : `第 ${day + 1} 天`,
      isToday: todayOffset !== null && day === todayOffset,
      inPlan: day <= spanEnd,
    };
  });

  return {
    anchor,
    cols,
    spanEnd,
    hiddenBefore: spans.filter((s) => s.endDay < anchor).length,
    hiddenAfter: spans.filter((s) => s.startDay > anchor + GANTT_COLS - 1).length,
  };
}

/** 条形在 8 列网格中的起止列（1 起，跨列数 = span）；完全落在窗口外返回 null。 */
export function barPlacement(
  span: GanttSpan,
  win: GanttWindow
): { col: number; count: number; clippedStart: boolean; clippedEnd: boolean } | null {
  const from = Math.max(span.startDay, win.anchor);
  const to = Math.min(span.endDay, win.anchor + GANTT_COLS - 1);
  if (to < from) return null;
  return {
    col: from - win.anchor + 1,
    count: to - from + 1,
    clippedStart: span.startDay < win.anchor,
    clippedEnd: span.endDay > win.anchor + GANTT_COLS - 1,
  };
}
