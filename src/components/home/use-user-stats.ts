"use client";

// ─── /api/user/stats 单一读取口（§3 屏一统计卡行的唯一数据源）───────────────
// 旧版本里 AchievementPanel 与 LevelBadge 各自 fetch 一次；现在共用本 hook，
// 由 home-page 调一次后把 stats 分发给统计卡行、等级徽章与周报分享卡。

import { useEffect, useState } from "react";
import { request } from "@/lib/api/request";

export interface UserStats {
  streak: number;
  todayCount: number;
  weekCount: number;
  totalCompleted: number;
  activeTaskCount: number;
  learnDays: number;
  totalGoals: number;
}

/** 本周目标数：沿用旧口径（每个进行中计划 3 项，下限 5 项） */
export function weekGoalOf(stats: UserStats): number {
  return Math.max(stats.activeTaskCount * 3, 5);
}

export function useUserStats(refreshTick = 0): UserStats | null {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await request("/api/user/stats");
        if (active && res.ok) {
          const data = (await res.json()) as UserStats;
          if (active) setStats(data);
        }
      } catch {
        /* 静默：统计卡退化为骨架，不打断主流程 */
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [refreshTick]);

  return stats;
}
