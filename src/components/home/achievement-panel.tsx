"use client";

/**
 * 今日左栏的三格统计（对照 `today.html` 的 `.stats`）。
 * 数值全部来自 /api/user/stats 与今日时间桶：待完成 / 今日深度工时 / 连续学习。
 */

import type { TodayMetrics } from "./today-metrics";
import { weekGoalOf, type UserStats } from "./use-user-stats";

interface Props {
  stats: UserStats;
  metrics: TodayMetrics;
}

export function AchievementPanel({ stats, metrics }: Props) {
  const goal = weekGoalOf(stats);

  return (
    <div className="mt-6 grid grid-cols-3 gap-3 border-y border-bd-card py-5">
      <div>
        <strong className="block font-chromatic text-display-sm leading-none text-ink">
          {String(metrics.todayPending).padStart(2, "0")}
        </strong>
        <span className="mt-2 block text-body-sm text-text-2">今日待完成</span>
      </div>
      <div>
        <strong className="block font-chromatic text-display-sm leading-none text-ink">
          {metrics.todayHours > 0 ? `${metrics.todayHours}h` : "—"}
        </strong>
        <span className="mt-2 block text-body-sm text-text-2">今日深度工时</span>
      </div>
      <div>
        <strong className="block font-chromatic text-display-sm leading-none text-ink">
          {String(stats.streak).padStart(2, "0")}
        </strong>
        <span className="mt-2 block text-body-sm text-text-2">连续学习 · 天</span>
      </div>
      <p className="col-span-3 mt-1 font-mono text-micro tracking-[.08em] text-text-3">
        本周完成 {stats.weekCount} / {goal} 项 · 累计 {stats.totalCompleted} 阶
      </p>
    </div>
  );
}
