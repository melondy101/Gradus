import type { Subtask } from "@/lib/db/schema";
import { addDays, fmtShortDate, toDate } from "./task-dates";
import { parseKeywords, parseResources, type ResourceView } from "./subtask-resource-view";

/**
 * 子任务视图模型 —— 屏二（甘特 / 清单 / 详情面板）共用的纯派生层。
 * 状态与文案全部来自真实字段：completed / startDay / durationDays /
 * bloomLevel / deepWorkHours / resources / keywords / description，无 mock。
 */

export type SubtaskState = "done" | "live" | "plan";

const BLOOM_NAMES = ["记忆", "理解", "应用", "分析", "评估", "创造"];

export function bloomName(level: number | null | undefined): string {
  if (!level || level < 1 || level > 6) return "";
  return `L${level} ${BLOOM_NAMES[level - 1]}`;
}

export interface SubtaskView {
  subtask: Subtask;
  state: SubtaskState;
  /** 相对任务起始日的偏移（0 起） */
  startDay: number;
  /** 闭区间末日 */
  endDay: number;
  bloomLevel: number | null;
  /** "L4 分析"，无层级时为空串 */
  bloom: string;
  deepWorkHours: number | null;
  durationDays: number;
  /** "09.19 – 09.21"；无起始日时退化为 "第 3–5 天" */
  schedule: string;
  resources: ResourceView[];
  verifiedCount: number;
  /** 从 description 拆出的行动项，不足 2 条则为空数组 */
  actions: string[];
  keywords: string[];
  topic: string | null;
}

function splitActions(description: string | null): string[] {
  if (!description) return [];
  const parts = description
    .split(/\n+|；|;/)
    .map((s) => s.replace(/^[\s\-*·•]+/, "").replace(/^\d+[.、)]\s*/, "").trim())
    .filter((s) => s.length >= 6);
  return parts.length >= 2 ? parts.slice(0, 5) : [];
}

function scheduleOf(
  startDate: string | Date | null | undefined,
  startDay: number,
  endDay: number
): string {
  const base = toDate(startDate);
  if (!base) return `第 ${startDay + 1}–${endDay + 1} 天`;
  const from = fmtShortDate(addDays(base, startDay));
  if (endDay === startDay) return from;
  return `${from} – ${fmtShortDate(addDays(base, endDay))}`;
}

export function buildSubtaskView(
  subtask: Subtask,
  startDate: string | Date | null | undefined,
  todayOffset: number | null
): SubtaskView {
  const startDay = subtask.startDay ?? 0;
  const durationDays = Math.max(subtask.durationDays ?? 1, 1);
  const endDay = startDay + durationDays - 1;

  let state: SubtaskState = "plan";
  if (subtask.completed) state = "done";
  else if (todayOffset !== null && todayOffset >= startDay && todayOffset <= endDay) state = "live";

  const resources = parseResources(subtask.resources);

  return {
    subtask,
    state,
    startDay,
    endDay,
    bloomLevel: subtask.bloomLevel ?? null,
    bloom: bloomName(subtask.bloomLevel),
    deepWorkHours: subtask.deepWorkHours ?? null,
    durationDays,
    schedule: scheduleOf(startDate, startDay, endDay),
    resources,
    verifiedCount: resources.filter((r) => r.verified).length,
    actions: splitActions(subtask.description),
    keywords: parseKeywords(subtask.keywords),
    topic: subtask.topic || null,
  };
}

export function buildSubtaskViews(
  subtasks: Subtask[],
  startDate: string | Date | null | undefined,
  todayOffset: number | null
): SubtaskView[] {
  return subtasks.map((s) => buildSubtaskView(s, startDate, todayOffset));
}

export function countStates(views: SubtaskView[]): Record<SubtaskState, number> {
  const out: Record<SubtaskState, number> = { done: 0, live: 0, plan: 0 };
  for (const v of views) out[v.state] += 1;
  return out;
}

/** 计划剩余天数：从今天算到最后一天，负数或无起始日时归零。 */
export function remainingDays(
  views: SubtaskView[],
  totalDays: number,
  todayOffset: number | null
): number {
  const spanEnd = views.reduce((m, v) => Math.max(m, v.endDay), totalDays - 1);
  if (todayOffset === null) return Math.max(spanEnd + 1, 0);
  return Math.max(spanEnd - todayOffset + 1, 0);
}

/** 出现次数最多的子任务主题（屏二元信息行的「主题：语言」）。 */
export function dominantTopic(views: SubtaskView[]): string | null {
  const counts = new Map<string, number>();
  for (const v of views) {
    if (v.topic) counts.set(v.topic, (counts.get(v.topic) ?? 0) + 1);
  }
  let best: string | null = null;
  let max = 0;
  for (const [topic, n] of counts) {
    if (n > max) {
      best = topic;
      max = n;
    }
  }
  return best;
}

export type { ResourceView };
