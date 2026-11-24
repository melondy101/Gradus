/**
 * 工时口径唯一真源（FB-02）
 *
 * 口径定义（此前全仓没有定义，导致同一条子任务在不同视图显示 1.5h / 3h / 4.5h）：
 *
 *   deep_work_hours  = **每日**深度专注小时数
 *                       AI 规划时由 prompts.ts 写下（"每天需要的深度专注时长"）
 *   子任务总工时       = 每日工时 × durationDays
 *   计划总工时         = Σ 子任务总工时
 *
 * 缺失 deep_work_hours 时按「每日 1.5 小时」估算，并标记 estimated = true，
 * 让 UI 有机会区分「AI 给的工时」与「兜底估算」。
 *
 * 全仓任何展示工时的地方都应走这里，不要再各自写一份换算。
 */

export interface WorkloadRow {
  durationDays?: number | null;
  deepWorkHours?: number | null;
}

export interface DailyWorkload {
  /** 每日深度专注小时数 */
  hours: number;
  /** true = AI 未给出工时，此值为兜底估算 */
  estimated: boolean;
}

/** 缺 deep_work_hours 时的兜底：每日 1.5 小时 */
export const DEFAULT_DAILY_HOURS = 1.5;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 子任务工期（天），最少 1 天 */
export function durationDaysOf(row: WorkloadRow): number {
  const days = Number(row.durationDays);
  return Number.isFinite(days) && days >= 1 ? Math.floor(days) : 1;
}

/** 每日深度专注工时 */
export function deepHoursOf(row: WorkloadRow): DailyWorkload {
  const raw = Number(row.deepWorkHours);
  if (Number.isFinite(raw) && raw > 0) return { hours: round1(raw), estimated: false };
  return { hours: DEFAULT_DAILY_HOURS, estimated: true };
}

/** 子任务总工时 = 每日工时 × 工期 */
export function totalHoursOf(row: WorkloadRow): number {
  const { hours } = deepHoursOf(row);
  return round1(hours * durationDaysOf(row));
}

/** 计划总工时 = Σ 子任务总工时 */
export function planTotalHours(rows: WorkloadRow[]): number {
  return round1(rows.reduce((sum, row) => sum + totalHoursOf(row), 0));
}

/** 当日工时合计：按每日工时求和（今天要做多少小时） */
export function dailyHoursTotal(rows: WorkloadRow[]): number {
  return round1(rows.reduce((sum, row) => sum + deepHoursOf(row).hours, 0));
}
