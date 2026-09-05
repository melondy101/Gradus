"use client";

import { useEffect } from "react";
import { useCurrentUser, updateCurrentUser } from "@/lib/auth/user-provider";

/**
 * No-op placeholder.
 *
 * 原来这个组件在 mobile 平台上 hit 一次 `/api/user/profile` 把 user upsert
 * 进本地 DB。改造后：
 *   - middleware 在任何受保护 API 请求前自动建临时账号
 *   - register 流程在自己的事务里把临时账号的 tasks 合并到正式账号
 *   - RSC 阶段根布局直接解出 user 注入 <UserProvider>，客户端无需再拉
 *
 * 因此该 effect 已经没有副作用，但仍保留导出避免破坏 import。
 *
 * 留下它同步 moduleUser 与 RSC 注入 user 的差异：客户端 hydrate 之前
 * moduleUser 是 null，hydrate 后 `<UserProvider>` 的 useEffect 会把 RSC
 * 注入的 user 写到 moduleUser；这里多调一次 updateCurrentUser 触发刷新，
 * 让首屏消费方（useCurrentUser）能拿到值（避免 tearing）。
 */
export function UserSyncEffect() {
  const user = useCurrentUser();
  useEffect(() => {
    if (user) updateCurrentUser(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}