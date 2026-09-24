"use client";

// ─── user stats 单一订阅口（§3 屏一统计卡行 / 等级徽章的唯一数据源）──────────
// Phase 3 起本 hook 不再自行 fetch：全站共享 @/features/stats/store 的模块级
// 快照，多组件同时挂载只发一次请求；打卡走 store.applyStatsDelta 本地增量。
// 类型与 fetch 仍在 @/lib/api/user-stats（typed client，审计 §4.4）。

import { useEffect, useSyncExternalStore } from "react";
import { useEazo } from "@/lib/eazo-shim";
import { getStatsSnapshot, subscribeStats, syncStats } from "@/features/stats/store";
import type { UserStats } from "@/lib/api/user-stats";

export type { UserStats };
export { weekGoalOf } from "@/lib/api/user-stats";

export function useUserStats(): UserStats | null {
  const user = useEazo((s) => s.auth.user);
  const userId = user?.id ?? null;

  useEffect(() => {
    void syncStats(userId);
  }, [userId]);

  const snapshot = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsSnapshot);
  // 快照属于他人（账号刚切换）视为未加载，避免旧账号数据闪现
  return snapshot.userId === userId ? snapshot.stats : null;
}
