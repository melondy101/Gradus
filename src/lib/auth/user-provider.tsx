"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import type { CurrentUserView } from "./current-user";

/**
 * 客户端"当前用户" store。
 *
 * 数据来源：
 *   - 根布局在 RSC 阶段调 `getCurrentUser()` 解出 user，作为 props
 *     注入 `<UserProvider user={...}>`，避免首屏再发一次 `/api/auth/me`。
 *   - 后续变更通过 `updateCurrentUser(next)` 模块级函数触发（登录/登出成功后）。
 *
 * 为什么用模块级 store + useSyncExternalStore：
 *   - 在 auth-shim.ts 里 `auth.logout()`、`auth.refresh()` 不在 React 渲染
 *     路径里被调用，没法走 Context Provider 的 setter。把 store 放在模块级
 *     让两者都能直接读写。
 *   - `useSyncExternalStore` 是 React 18+ 推荐订阅外部 store 的方式，避
 *     免 tearing。
 */

type Listener = () => void;

const listeners = new Set<Listener>();

// `undefined` 表示客户端 store 尚未由 `<UserProvider>` 初始化；它与真实的
// 未登录态 `null` 必须区分开。水合期间会回退到 Provider 从 RSC 带来的快照。
let moduleUser: CurrentUserView | null | undefined;

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CurrentUserView | null {
  return moduleUser ?? null;
}

/** 模块级直接读快照（非 React 上下文也能用，例如 auth.user getter）。 */
export function getCurrentUserSnapshot(): CurrentUserView | null {
  return getSnapshot();
}

/**
 * 从任意客户端代码（事件处理器、async 函数）触发 user 更新。
 * 例：登录成功后调 `updateCurrentUser(user)`，所有订阅它的组件立即重渲染。
 */
export function updateCurrentUser(user: CurrentUserView | null): void {
  if (
    user !== null &&
    moduleUser !== undefined &&
    moduleUser !== null &&
    moduleUser.id === user.id &&
    moduleUser.email === user.email &&
    moduleUser.name === user.name
  ) {
    return;
  }
  moduleUser = user;
  for (const l of listeners) l();
}

// 让 SSR 和客户端水合首帧都读取同一份 RSC 用户快照。模块级 store 只负责
// 水合后的登录/登出更新，不能作为 SSR 快照来源。
const CurrentUserContext = createContext<CurrentUserView | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUserView | null;
  children: ReactNode;
}) {
  // 水合完成后再初始化客户端 store。首帧由 CurrentUserContext 提供相同快照，
  // 所以不会出现 SSR 的访客按钮与客户端的已登录链接互相替换。
  useEffect(() => {
    if (moduleUser === undefined) {
      moduleUser = user;
      for (const l of listeners) l();
    }
  }, [user]);

  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/** 读取当前 user（首屏由 RSC 注入；之后由 updateCurrentUser() 驱动）。 */
export function useCurrentUser(): CurrentUserView | null {
  const initialUser = useContext(CurrentUserContext);
  return useSyncExternalStore(
    subscribe,
    () => moduleUser === undefined ? initialUser : getSnapshot(),
    () => initialUser,
  );
}

/** 仅判断"有没有 user"——避免在 React 18 streaming 中误读。 */
export function useHasUser(): boolean {
  return useCurrentUser() !== null;
}
