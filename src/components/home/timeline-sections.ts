// ─── 今日/后续时间桶分组（§3 屏一「今日子任务」列表的数据来源）───────────────
// 纯函数：home-page 用它把 subtaskRows 分到 today/tomorrow/week/later 四段，
// 屏一的统计与列表都只读这里的真实分组结果，不另造口径。

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { getSubtaskActualDates } from "./subtask-row";

export type TimeFilter = "today" | "tomorrow" | "week" | "later" | "all";

export interface TimelineSection {
  key: TimeFilter;
  label: string;
  sublabel: string;
  /** 品牌令牌：今日=点缀黄，其后依次退到暖灰（黄色只给「此刻」） */
  accentColor: string;
  rows: SubtaskWithTask[];
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

const SECTION_ACCENT: Record<Exclude<TimeFilter, "all">, string> = {
  today: "var(--accent, #F5C518)",
  tomorrow: "var(--accent-deep, #E3B40F)",
  week: "var(--bloom-4, #6E6B62)",
  later: "var(--bd-check, #C9C3B2)",
};

/** ISO 日期（本地日零时），用于 CSS/组件层比较 */
export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 落点判定：子任务的起止区间是否覆盖某一天。
 * 无排期（缺 taskStartDate）的子任务一律先落在「今日」，与旧行为一致。
 */
export function buildTimelineSections(
  rows: SubtaskWithTask[],
  t: Translate,
  locale: string
): TimelineSection[] {
  const now = new Date();
  const today = startOfToday(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(locale, { month: "long", day: "numeric", weekday: "short" });
  const fmtRange = (s: Date, e: Date) =>
    `${s.toLocaleDateString(locale, { month: "numeric", day: "numeric" })} — ${e.toLocaleDateString(
      locale,
      { month: "numeric", day: "numeric" }
    )}`;

  const buckets: Record<Exclude<TimeFilter, "all">, SubtaskWithTask[]> = {
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  };

  for (const r of rows) {
    const dates = getSubtaskActualDates(r);
    if (!dates) {
      buckets.today.push(r);
      continue;
    }
    const { start, end } = dates;
    if (start <= today && today <= end) buckets.today.push(r);
    else if (start <= tomorrow && tomorrow <= end) buckets.tomorrow.push(r);
    else if (start <= weekEnd && end >= today) buckets.week.push(r);
    else buckets.later.push(r);
  }

  const sort = (arr: SubtaskWithTask[]) => [...arr].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    (["today", "tomorrow", "week", "later"] as const).map((key) => ({
      key,
      label: t(`home.timeline.${key}`),
      sublabel:
        key === "today" ? fmtDate(today)
        : key === "tomorrow" ? fmtDate(tomorrow)
        : key === "week" ? fmtRange(new Date(today.getTime() + 2 * 86400000), weekEnd)
        : "7天后接续",
      accentColor: SECTION_ACCENT[key],
      rows: sort(buckets[key]),
    })) as TimelineSection[]
  );
}

export function sectionOf(sections: TimelineSection[], key: TimeFilter): TimelineSection | undefined {
  return sections.find((s) => s.key === key);
}
