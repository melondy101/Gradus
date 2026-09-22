"use client";

/**
 * 屏一「统计卡行」（《品牌与产品设计说明》§3 屏幕一 / 原 app.css `.stats` `.stat`
 * `.label-mono` `.stat__foot` `.stat--accent`）。
 *
 * 由旧的 AchievementPanel 药丸条改造而来：四张卡对应
 *   进行中 · 今日待完成 · 连续学习 · 本周完成率（第四张为黄色强调卡）
 * 数值全部来自 /api/user/stats 与 home-page 计算的今日时间桶，无一处占位假数据。
 */

import { Stat, StatRow } from "@/components/ui/stat";
import type { TodayMetrics } from "./today-metrics";
import type { UserStats } from "./use-user-stats";
import { weekGoalOf } from "./use-user-stats";

interface Props {
  stats: UserStats;
  metrics: TodayMetrics;
  /** 窄屏（<=1024px）统计卡退化为 2×2 */
  narrow?: boolean;
}

export function AchievementPanel({ stats, metrics, narrow = false }: Props) {
  const goal = weekGoalOf(stats);
  const weekPct = goal > 0 ? Math.min(100, Math.round((stats.weekCount / goal) * 100)) : 0;

  return (
    <StatRow className={narrow ? "mb-3 grid-cols-2 lg:grid-cols-2" : "mb-3"}>
      <Stat
        label="进行中"
        value={stats.activeTaskCount}
        foot={
          metrics.nextDeadline
            ? `最近截止 ${metrics.nextDeadline}`
            : `${stats.totalGoals} 个历史目标`
        }
      />

      <Stat
        label="今日待完成"
        value={metrics.todayPending}
        foot={
          <>
            共 {metrics.todayTotal} 项子任务
            {metrics.todayHours > 0 ? ` · ${metrics.todayHours} 小时` : ""}
          </>
        }
      />

      <Stat
        label="连续学习"
        value={stats.streak}
        unit="天"
        foot={`累计 ${stats.totalCompleted} 阶 · 学习 ${stats.learnDays} 天`}
      />

      <Stat
        label="本周完成率"
        tone="accent"
        value={`${weekPct}%`}
        foot={`本周完成 ${stats.weekCount} / ${goal} 项`}
      />
    </StatRow>
  );
}
