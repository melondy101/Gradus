"use client";

// NotificationCenter 三处挂载共用的订阅入口（Phase 3 #22）：状态来自
// features/notifications/store 单例；本 hook 只负责按当前账号同步、
// 引用计数启停轮询，以及提供弹层打开时的强制刷新。

import { useEffect, useSyncExternalStore } from "react";
import { useSessionUser } from "@/lib/auth-shim";
import {
  acquireNotificationsPolling,
  getNotificationsSnapshot,
  refreshNotifications,
  subscribeNotifications,
  syncNotifications,
} from "./store";

export function useNotifications() {
  const user = useSessionUser((s) => s.auth.user);
  const userId = user?.id ?? null;

  useEffect(() => acquireNotificationsPolling(), []);
  useEffect(() => {
    void syncNotifications(userId);
  }, [userId]);

  const snapshot = useSyncExternalStore(
    subscribeNotifications,
    getNotificationsSnapshot,
    getNotificationsSnapshot,
  );

  const own = snapshot.userId === userId;
  const notifications = own ? snapshot.notifications : [];
  const unreadCount = own ? snapshot.unreadCount : 0;

  const refresh = () => {
    if (!userId) return Promise.resolve(false);
    return refreshNotifications(userId);
  };

  return { notifications, unreadCount, loaded: own && snapshot.loaded, refresh };
}
