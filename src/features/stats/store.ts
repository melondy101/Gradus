/**
 * user stats 模块级单例（Phase 3 · 审计 §状态收敛）。
 * 全站只保有一份 /api/user/stats 快照：多组件订阅共享同一次请求，
 * 打卡成功走本地增量（0 额外请求），账号按 userId 隔离自动失效。
 */

import { fetchUserStats, type UserStats } from "@/lib/api/user-stats";

export interface StatsSnapshot {
  userId: string | null;
  stats: UserStats | null;
}

const listeners = new Set<() => void>();
let snapshot: StatsSnapshot = { userId: null, stats: null };
let inflight: Promise<void> | null = null;
let inflightFor: string | null = null;

function commit(next: StatsSnapshot): void {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function getStatsSnapshot(): StatsSnapshot {
  return snapshot;
}

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 幂等加载：同账号已有数据或在途请求时直接复用，多消费者只发一次。 */
export function syncStats(userId: string | null): Promise<void> {
  if (!userId) {
    if (snapshot.userId !== null) commit({ userId: null, stats: null });
    return Promise.resolve();
  }
  if (snapshot.userId === userId && snapshot.stats) return Promise.resolve();
  if (inflight && inflightFor === userId) return inflight;
  inflightFor = userId;
  inflight = (async () => {
    try {
      const res = await fetchUserStats();
      // 账号在请求期间切换时丢弃过期响应
      if (res.ok && inflightFor === userId) commit({ userId, stats: res.data });
    } finally {
      if (inflightFor === userId) {
        inflight = null;
        inflightFor = null;
      }
    }
  })();
  return inflight;
}

/** 打卡/取消打卡的本地增量；返回增量后的 totalCompleted（stats 未加载时 null）。 */
export function applyStatsDelta(patch: Partial<Pick<UserStats, "totalCompleted" | "todayCount">>): number | null {
  const { userId, stats } = snapshot;
  if (!userId || !stats) return null;
  const clamp = (v: number) => Math.max(0, v);
  const next: UserStats = {
    ...stats,
    totalCompleted: clamp(stats.totalCompleted + (patch.totalCompleted ?? 0)),
    todayCount: clamp(stats.todayCount + (patch.todayCount ?? 0)),
  };
  commit({ userId, stats: next });
  return next.totalCompleted;
}

/** 仅供测试：清空单例快照与在途标记。 */
export function __resetStatsStoreForTests(): void {
  inflight = null;
  inflightFor = null;
  commit({ userId: null, stats: null });
}
/** 强制刷新（分析完成等需要服务端真值的场景）；在途时复用。 */
export function refreshStats(userId: string | null): Promise<void> {
  if (inflight && inflightFor === userId) return inflight;
  if (!userId) return Promise.resolve();
  inflightFor = userId;
  inflight = (async () => {
    try {
      const res = await fetchUserStats();
      if (res.ok && inflightFor === userId) commit({ userId, stats: res.data });
    } finally {
      if (inflightFor === userId) {
        inflight = null;
        inflightFor = null;
      }
    }
  })();
  return inflight;
}
