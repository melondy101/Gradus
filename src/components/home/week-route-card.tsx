"use client";

/**
 * AI 右栏顶部的「本周路线」卡（对照 `today.html` 的 `.side > .week`）。
 *
 * 全部数值来自真实子任务与 /api/user/stats：
 * 本周（周一→周日）与任务日期区间相交的行、其完成数与出现最多的认知层级。
 * 原型的「难度 ★★☆」没有数据源，改为真实周日期区间；层级色谱不足四格时用中性底补齐，
 * 不编造层级。
 */

import { addDays } from "@/lib/dates";
import { T, bloomChromatic } from "@/lib/design-tokens";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import type { UserStats } from "./use-user-stats";
import { getSubtaskActualDates } from "./subtask-row";

interface Props {
  /** 全量子任务（未经过视图筛选），与今日色带同源 */
  rows: SubtaskWithTask[];
  stats: UserStats | null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function WeekRouteCard({ rows, stats }: Props) {
  const today = startOfDay(new Date());
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const sunday = addDays(monday, 6);

  const weekRows = rows.filter((row) => {
    const dates = getSubtaskActualDates(row);
    return dates ? dates.start <= sunday && dates.end >= monday : false;
  });

  // 本周出现最多的计划名；没有排期时如实留白
  const planTally = new Map<string, number>();
  for (const row of weekRows) {
    planTally.set(row.taskTitle, (planTally.get(row.taskTitle) ?? 0) + 1);
  }
  let planName = "本周暂无排期";
  let planBest = 0;
  for (const [title, count] of planTally) {
    if (count > planBest) { planBest = count; planName = title; }
  }

  // 认知层级色谱：按出现次数取前四档，不足四格用中性底
  const levelTally = new Map<number, number>();
  for (const row of weekRows) {
    const level = Math.min(6, Math.max(1, row.bloomLevel || 1));
    levelTally.set(level, (levelTally.get(level) ?? 0) + 1);
  }
  const levels = [...levelTally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([level]) => level);

  const done = weekRows.filter((row) => row.completed).length;
  const pct = weekRows.length > 0 ? Math.round((done / weekRows.length) * 100) : null;
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <section className="border border-ink px-4 py-3" style={{ background: T.soft }}>
      <div className="flex items-baseline justify-between gap-2 border-b border-ink pb-2">
        <Eyebrow className="mb-0">WEEK ROUTE</Eyebrow>
        <span className="font-mono text-micro tracking-[.08em] text-text-2">
          {fmt(monday)} — {fmt(sunday)}
        </span>
      </div>

      <h3 className="mt-3 font-chromatic text-title-sm leading-tight text-ink">
        {planName}
      </h3>

      <div className="mt-3 grid h-5 grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{ background: levels[i] ? bloomChromatic(levels[i]) : T.line }}
          />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3">
        <div>
          <strong className="block font-chromatic text-title-sm leading-none text-ink">
            {stats ? String(stats.streak).padStart(2, "0") : "—"}
          </strong>
          <span className="mt-1.5 block text-micro text-text-2">连续天数</span>
        </div>
        <div>
          <strong className="block font-chromatic text-title-sm leading-none text-ink">
            {done} / {weekRows.length}
          </strong>
          <span className="mt-1.5 block text-micro text-text-2">本周完成</span>
        </div>
        <div>
          <strong className="block font-chromatic text-title-sm leading-none text-ink">
            {pct === null ? "—" : `${pct}%`}
          </strong>
          <span className="mt-1.5 block text-micro text-text-2">完成率</span>
        </div>
      </div>
    </section>
  );
}
