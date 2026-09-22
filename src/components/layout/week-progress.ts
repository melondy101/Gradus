/**
 * 本周进度计算 —— 《品牌与产品设计说明》§3 共用外壳的 .side__widget 数据源。
 * 纯函数模块：不取数、不依赖组件状态，只做「已传入数据」的聚合。
 */

/** 侧边栏所需的最小子任务形状，可直接接收 home-page 已有的 SubtaskWithTask[] */
export interface WeekSubtaskLike {
  completed: boolean;
  /** 子任务在原大任务排期中的起始偏移天 */
  startDay?: number | null;
  /** 子任务持续天数 */
  durationDays?: number | null;
  /** 所属大任务的开始日期 */
  taskStartDate?: Date | string | number | null;
  /** 完成时间（东八区换日前的原始时间戳） */
  completedAt?: Date | string | number | null;
  /** 预计深度学习时长（小时） */
  deepWorkHours?: number | null;
}

export interface WeekProgressModel {
  /** false = 上层尚未传入本周排期明细，退化为「仅用现有计数」的今日口径 */
  hasData: boolean;
  /** 0–100，黄色进度条宽度 */
  percent: number;
  /** .side__meta 的 <b> 大字数值 */
  value: number;
  /** 大字数值后的说明文案 */
  unit: string;
  /** .side__foot 的等宽脚注 */
  caption: string;
}

export interface WeekProgressFallback {
  todayPending: number;
  totalPlans: number;
}

const MS_PER_DAY = 86_400_000;

/** 本周一 00:00（本地时区，与排期算法一致） */
export function startOfWeek(now: Date = new Date()): number {
  const d = new Date(now);
  const offsetFromMonday = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - offsetFromMonday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function toDate(value?: Date | string | number | null): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toHours(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clampPercent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/** 子任务的排期起点（无大任务起始日期时返回 null，只按完成时间归集） */
function plannedStart(subtask: WeekSubtaskLike): number | null {
  const base = toDate(subtask.taskStartDate);
  if (!base) return null;
  const offsetDays = Number.isFinite(subtask.startDay ?? NaN) ? (subtask.startDay as number) : 0;
  return base.getTime() + offsetDays * MS_PER_DAY;
}

/** 该子任务是否落在本周（周一至周日）：排期区间与本周区间相交，或本周内完成 */
export function isWithinWeek(
  subtask: WeekSubtaskLike,
  weekStart: number = startOfWeek()
): boolean {
  const weekEnd = weekStart + 7 * MS_PER_DAY;

  const completedAt = toDate(subtask.completedAt);
  if (completedAt && completedAt.getTime() >= weekStart && completedAt.getTime() < weekEnd) {
    return true;
  }

  const start = plannedStart(subtask);
  if (start === null) return false;
  const durationDays =
    Number.isFinite(subtask.durationDays ?? NaN) && (subtask.durationDays as number) > 0
      ? (subtask.durationDays as number)
      : 1;
  const end = start + durationDays * MS_PER_DAY;
  return start < weekEnd && end > weekStart;
}

/** 未接入本周排期明细时的兜底口径：只使用侧边栏已有的真实计数 */
function fallbackModel({ todayPending, totalPlans }: WeekProgressFallback): WeekProgressModel {
  return {
    hasData: false,
    percent: todayPending === 0 && totalPlans > 0 ? 100 : 0,
    value: todayPending,
    unit: " 项今日待完成",
    caption: totalPlans > 0 ? `${totalPlans} 个计划进行中` : "暂无学习任务",
  };
}

/**
 * 聚合本周进度。传入空数组或非数组时走兜底口径，绝不编造数值。
 */
export function computeWeekProgress(
  weekSubtasks: WeekSubtaskLike[] | undefined,
  fallback: WeekProgressFallback,
  now: Date = new Date()
): WeekProgressModel {
  if (!Array.isArray(weekSubtasks) || weekSubtasks.length === 0) {
    return fallbackModel(fallback);
  }

  const weekStart = startOfWeek(now);
  const weekRows = weekSubtasks.filter((row) => isWithinWeek(row, weekStart));
  if (weekRows.length === 0) return fallbackModel(fallback);

  let done = 0;
  let hoursDone = 0;
  let hoursPlanned = 0;

  for (const row of weekRows) {
    const hours = toHours(row.deepWorkHours);
    hoursPlanned += hours;
    if (row.completed) {
      done += 1;
      hoursDone += hours;
    }
  }

  const total = weekRows.length;
  const pending = total - done;
  const byHours = hoursPlanned >= 1;
  const percent = byHours
    ? clampPercent(hoursDone, hoursPlanned)
    : clampPercent(done, total);

  return {
    hasData: true,
    percent,
    value: byHours ? round1(hoursDone) : done,
    unit: byHours ? ` / ${round1(hoursPlanned)} 小时` : ` / ${total} 项子任务`,
    caption: `完成率 ${percent}% · 待完成 ${pending} 项`,
  };
}
