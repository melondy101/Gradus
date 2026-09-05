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
 *   - 在 eazo-shim.ts 里 `auth.logout()`、`auth.refresh()` 不在 React 渲染
 *     路径里被调用，没法走 Context Provider 的 setter。把 store 放在模块级
 *     让两者都能直接读写。
 *   - `useSyncExternalStore` 是 React 18+ 推荐订阅外部 store 的方式，避
 *     免 tearing。
 */

type Listener = () => void;

const listeners = new Set<Listener>();

// 模块级 user 状态。初始值由 `<UserProvider>` 在客户端挂载时 sync 进来。
let moduleUser: CurrentUserView | null = null;

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CurrentUserView | null {
  return moduleUser;
}

/** 模块级直接读快照（非 React 上下文也能用，例如 auth.user getter）。 */
export function getCurrentUserSnapshot(): CurrentUserView | null {
  return moduleUser;
}

/**
 * 从任意客户端代码（事件处理器、async 函数）触发 user 更新。
 * 例：登录成功后调 `updateCurrentUser(user)`，所有订阅它的组件立即重渲染。
 */
export function updateCurrentUser(user: CurrentUserView | null): void {
  if (
    user !== null &&
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

// Context 主要用来告诉组件"client-side 已经有 user"——但实际读 user
// 还是用 useCurrentUser()（订阅模块级 store）。
const HasUserContext = createContext(false);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUserView | null;
  children: ReactNode;
}) {
  // 关键：必须在 useEffect 之前就把 moduleUser 设上 —— 否则首屏渲染
  // 会触发"SSR null vs client null"的不一致错误。实际上 React 的
  // "use client" 文件 SSR 渲染时，模块级 moduleUser 已经被 provider 上面
  // 别的实例同步过；这里只是兜底。
  // 该赋值发生在 render 期是故意的（确保首次客户端渲染与 SSR 一致，避免
  // hydration mismatch），并非副作用 bug，故在赋值处禁用对应规则。
  if (typeof window !== "undefined" && moduleUser === null && user !== null) {
    // eslint-disable-next-line react-hooks/globals
    moduleUser = user;
  }

  // 保留 useEffect 兼容：将来 React 升级或重渲染场景下再次同步
  useEffect(() => {
    if (moduleUser === null && user !== null) {
      moduleUser = user;
      // 触发所有 listener 重渲染
      for (const l of listeners) l();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HasUserContext.Provider value={user !== null}>
      {children}
    </HasUserContext.Provider>
  );
}

/** 读取当前 user（首屏由 RSC 注入；之后由 updateCurrentUser() 驱动）。 */
export function useCurrentUser(): CurrentUserView | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 仅判断"有没有 user"——避免在 React 18 streaming 中误读。 */
export function useHasUser(): boolean {
  return useContext(HasUserContext);
}