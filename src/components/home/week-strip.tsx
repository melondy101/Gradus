"use client";

/**
 * 今日视图底部的「本周接续排期」色带（对照 `today.html` 的 `.calendar`）。
 * 七天分别是本周一→周日：每天的真实任务数 + 当天占比最高的认知层级；
 * 今天用朱砂底反白，与甘特的今日列同一语言。
 */

import { addDays } from "@/lib/dates";
import { BLOOM_CONFIG, PLAN_CHROMATIC, bloomChromatic } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { getSubtaskActualDates } from "./subtask-row";

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

interface Props {
  rows: SubtaskWithTask[];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isoWeek(date: Date): number {
  const first = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) / 7);
}

export function WeekStrip({ rows }: Props) {
  const today = startOfDay(new Date());
  const offset = (today.getDay() + 6) % 7;
  const monday = addDays(today, -offset);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  return (
    <section className="border-t-2 border-ink" style={{ background: "var(--cream)" }}>
      <div className="flex flex-wrap items-end justify-between gap-2 px-5 pt-4 pb-3 sm:px-8">
        <b className="font-chromatic text-title-sm text-ink">本周接续排期</b>
        <span className="font-mono text-caption tracking-[.08em] text-text-2">
          WEEK {isoWeek(today)} / {today.getFullYear()}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 border-t border-bd-card">
          {days.map((day, index) => {
            const isToday = day.getTime() === today.getTime();
            const dayRows = rows.filter((row) => {
              const dates = getSubtaskActualDates(row);
              return dates ? dates.start <= day && day <= dates.end : false;
            });

            const tally = new Map<number, number>();
            for (const row of dayRows) {
              const level = Math.min(6, Math.max(1, row.bloomLevel || 1));
              tally.set(level, (tally.get(level) ?? 0) + 1);
            }
            let dominant = 0;
            let best = 0;
            for (const [level, count] of tally) {
              if (count > best) { best = count; dominant = level; }
            }
            const levelName = dominant ? BLOOM_CONFIG[dominant as 1].name : "休整";
            const levelColor = dominant ? bloomChromatic(dominant) : "var(--text-3)";

            return (
              <div
                key={index}
                className={cn(
                  "border-r border-bd-card px-3 py-3 last:border-r-0",
                  isToday && "text-cream"
                )}
                style={isToday ? { background: PLAN_CHROMATIC.vermilion } : undefined}
              >
                <strong className="block font-chromatic text-body leading-none">
                  {isToday ? "今天" : WEEKDAYS[index]}
                </strong>
                <span
                  className="mt-2 block text-caption"
                  style={{ color: isToday ? undefined : levelColor }}
                >
                  {levelName}
                </span>
                <small className="mt-1 block font-mono text-micro tracking-[.06em] opacity-70">
                  {dayRows.length > 0 ? `${dayRows.length} TASKS` : "REST"}
                </small>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
