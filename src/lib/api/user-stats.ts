"use client";

// /api/user/stats typed client。UserStats 真相源从 components/home 上收到
// 数据服务层，供单例 store（features/stats）与消费组件共用。

import { apiFetch, type ApiResult } from "@/lib/api/result";

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

export function fetchUserStats(): Promise<ApiResult<UserStats>> {
  return apiFetch<UserStats>("/api/user/stats");
}
