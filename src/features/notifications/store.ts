// 站内通知模块级单例（Phase 3 #22）：NotificationCenter 在桌面侧栏、移动端
// 顶栏、视图头部最多三处挂载，各自持列表状态会产生重复轮询；统一为本 store
// 的单份 30s 轮询（按订阅数引用计数启停）+ 快照订阅。
// 账号切换守卫：resolve 时校验 inflightFor === userId，快照不匹配归属者时视为未加载。

import type { Notification } from "@/lib/db/schema";
import {
  fetchNotifications,
  markNotificationRead,
  clearNotifications,
} from "@/lib/api/notifications";

export interface NotificationsSnapshot {
  userId: string | null;
  notifications: Notification[];
  unreadCount: number;
  loaded: boolean;
}

const POLL_INTERVAL_MS = 30_000;

let snapshot: NotificationsSnapshot = {
  userId: null,
  notifications: [],
  unreadCount: 0,
  loaded: false,
};

const listeners = new Set<() => void>();

function commit(patch: Partial<NotificationsSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
}

export function getNotificationsSnapshot(): NotificationsSnapshot {
  return snapshot;
}

export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (snapshot.userId && inflightFor === null) void runFetch(snapshot.userId);
  }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

export function acquireNotificationsPolling(): () => void {
  subscriberCount += 1;
  startPolling();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    subscriberCount -= 1;
    if (subscriberCount <= 0) {
      subscriberCount = 0;
      stopPolling();
    }
  };
}

let inflightFor: string | null = null;

async function runFetch(userId: string): Promise<boolean> {
  inflightFor = userId;
  try {
    const res = await fetchNotifications();
    if (inflightFor !== userId) return false;
    if (res.ok) {
      commit({
        userId,
        notifications: res.data.notifications ?? [],
        unreadCount: res.data.unreadCount ?? 0,
        loaded: true,
      });
      return true;
    }
    return false;
  } finally {
    if (inflightFor === userId) inflightFor = null;
  }
}

/** 首拉去重：已有数据或同账号请求在途则跳过；null 清归属者。 */
export function syncNotifications(userId: string | null): Promise<boolean> {
  if (!userId) {
    inflightFor = null;
    commit({ userId: null, notifications: [], unreadCount: 0, loaded: false });
    return Promise.resolve(false);
  }
  if (snapshot.userId === userId && snapshot.loaded) return Promise.resolve(true);
  if (inflightFor === userId) return Promise.resolve(false);
  return runFetch(userId);
}

/** 强制刷新（弹层打开等场景），不做已加载短路；同账号在途时去重。 */
export function refreshNotifications(userId: string | null): Promise<boolean> {
  if (!userId) return Promise.resolve(false);
  if (inflightFor === userId) return Promise.resolve(false);
  if (snapshot.userId === userId && snapshot.loaded) return Promise.resolve(true);
  return runFetch(userId);
}

function applyEnvelope(
  userId: string,
  res: Awaited<ReturnType<typeof markNotificationRead>>,
): boolean {
  if (!res.ok || inflightFor !== null) return false;
  if (snapshot.userId !== userId) return false;
  commit({
    notifications: res.data.notifications ?? [],
    unreadCount: res.data.unreadCount ?? 0,
  });
  return true;
}

export async function markRead(id?: string): Promise<boolean> {
  const userId = snapshot.userId;
  if (!userId) return false;
  const res = await markNotificationRead(id, id === undefined ? true : undefined);
  return applyEnvelope(userId, res);
}

export async function markAllRead(): Promise<boolean> {
  const userId = snapshot.userId;
  if (!userId) return false;
  const res = await markNotificationRead(undefined, true);
  return applyEnvelope(userId, res);
}

export async function clearAll(): Promise<boolean> {
  const userId = snapshot.userId;
  if (!userId) return false;
  const res = await clearNotifications();
  if (!res.ok || inflightFor !== null || snapshot.userId !== userId) return false;
  commit({ notifications: [], unreadCount: 0 });
  return true;
}

/** 仅供测试：清空单例状态与在途标记。 */
export function __resetNotificationsStoreForTests(): void {
  inflightFor = null;
  commit({ userId: null, notifications: [], unreadCount: 0, loaded: false });
}
