"use client";

// Self-hosted auth/session 兼容层。
//
// 早期代码跑在第三方平台里，鉴权由平台 SDK 提供。迁到自托管 JWT cookie
// 会话（见 docs/plans/2026-08-14-multi-user-isolation.md）之后，这里不再
// 持有任何平台状态，只负责把服务端注入的 <UserProvider> 里的 user 透出来，
// 让既有的 `useSessionUser(...)` 与 `auth.*` 调用点无需改动即可继续工作。

import {
  useCurrentUser,
  updateCurrentUser,
  getCurrentUserSnapshot,
} from "@/lib/auth/user-provider";
import { fetchMe, logoutSession } from "@/lib/api/auth";
import type { CurrentUserView } from "@/lib/auth/current-user";
import type { User } from "@/lib/db/schema";

/**
 * Adapter: `CurrentUserView` (auth/current-user.ts) → `User` (db schema).
 *
 * The two are structurally identical for the fields UI cares about
 * (id/name/email). avatarUrl/passwordHash/emailLower/createdAt/updatedAt are
 * filled with safe placeholders; nothing in the UI currently reads them off
 * this path.
 */
// 缓存上一次适配结果，按 id/email/name 判定是否复用同一对象引用。
// 关键：useSessionUser(s => s.auth.user) 在每次渲染都会调用 adaptUser，若不缓存，
// 每次都返回新 User 对象 → 所有把 user 放进 useEffect 依赖数组的组件都会在
// 每次渲染后重跑 effect，形成"渲染→拉取→setState→渲染"的无限循环
// （表现为左侧列表/进度频闪、疯狂轮询 /api/subtasks、误报网络异常）。
let cachedUserView: CurrentUserView | null = null;
let cachedUser: User | null = null;

function adaptUser(view: CurrentUserView | null): User | null {
  if (view === null) {
    cachedUserView = null;
    cachedUser = null;
    return null;
  }
  const same =
    cachedUserView !== null &&
    cachedUserView.id === view.id &&
    cachedUserView.email === view.email &&
    cachedUserView.name === view.name &&
    cachedUserView.watchaBound === view.watchaBound &&
    cachedUserView.membershipTier === view.membershipTier &&
    cachedUserView.membershipExpiresAt === view.membershipExpiresAt;
  if (same) return cachedUser;
  cachedUserView = view;
  cachedUser = {
    id: view.id,
    email: view.email,
    name: view.name,
    avatarUrl: null,
    passwordHash: "",
    emailLower: view.email ? view.email.toLowerCase() : null,
    watchaOpenId: view.watchaBound ? "bound" : null,
    membershipTier: view.membershipTier ?? "free",
    membershipExpiresAt: view.membershipExpiresAt ? new Date(view.membershipExpiresAt) : null,
    aiGenerateCount: 0,
    aiAdjustCount: 0,
    taskOpsCount: 0,
    lastUsageDate: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  return cachedUser;
}

type SessionState = {
  auth: { user: User | null; authenticated: boolean };
  device: { platform: "web" | "mobile" };
};

// ── 全局"打开登录/注册弹窗"的注册点 ──────────────────────────────────
// 旧的 `auth.login()` 调用点遍布各页面（header / task-detail / history /
// 未登录提示区），但它们无法直接渲染 React 弹窗。改为：由全局唯一挂载的
// `<GlobalAuthModal>` 在挂载时注册一个处理器，`auth.login()` 调用它来打开
// 弹窗。这样所有旧调用点无需改动即可重新生效。
type OpenAuthHandler = (mode?: "login" | "register") => void;
let openAuthHandler: OpenAuthHandler | null = null;

/** 由 <GlobalAuthModal> 注册/注销弹窗打开处理器。 */
export function registerOpenAuth(handler: OpenAuthHandler | null): void {
  openAuthHandler = handler;
}

/**
 * Selector hook —— 从 `<UserProvider>` 注入的模块级 store 读真实 user。
 * `adaptUser` 按 id/email/name **缓存同一对象引用**，所以
 * `useSessionUser(s => s.auth.user)` 在同用户下返回稳定引用。
 * ⚠️ 把 `user` 对象直接放进 `useEffect` 依赖数组仍是大忌——务必依赖
 * `user?.id`（稳定字符串），否则任一上下文 hook 返回新引用都会触发无限重拉
 * 循环（home/task-detail 均已踩过）。
 */
export function useSessionUser<T>(selector: (s: SessionState) => T): T {
  const user = adaptUser(useCurrentUser());
  const state: SessionState = {
    auth: {
      user,
      authenticated: user !== null,
    },
    device: { platform: "web" },
  };
  return selector(state);
}

/**
 * Auth singleton —— `auth.login()` / `auth.logout()` / `auth.user`。
 *
 * Note: `auth.user` 是一次性读快照，并不是 reactive 的；要订阅用
 * `useSessionUser(s => s.auth.user)` 即可。
 */
export const auth = {
  get user(): User | null {
    return adaptUser(readCurrentUserSnapshot());
  },

  async getSessionHeader(): Promise<string | null> {
    // Self-hosted: cookies are sent automatically by the browser; no
    // custom header is needed.
    return null;
  },

  async login(mode: "login" | "register" = "login"): Promise<void> {
    // 实际登录走 <AuthModal>：通过全局注册的处理器打开弹窗，让所有
    // 旧的 `auth.login()` 调用点（header / task-detail / history 等）无需
    // 改动即可弹出登录/注册弹窗。
    openAuthHandler?.(mode);
  },

  async logout(): Promise<void> {
    const res = await logoutSession();
    if (!res.ok) {
      console.warn("[auth] logout request failed:", res.kind, res.message);
    }
    // Clear local user state so the UI updates immediately.
    updateCurrentUser(null);
  },

  /**
   * 重新拉取当前用户。Login/Register 成功后由调用方触发，让 React 树立即反映新 user。
   */
  async refresh(): Promise<void> {
    const res = await fetchMe();
    if (!res.ok) {
      // 服务端确认账号已不存在（幽灵会话防线）→ 清本地登录态；
      // 其余失败（网络/非 JSON）保留旧 user，避免误清有效登录态。
      if (res.accountMissing) updateCurrentUser(null);
      return;
    }
    updateCurrentUser(res.data.ok ? res.data.user ?? null : null);
  },
};

// 在模块顶层（非 React 上下文）也能读出当前 user——通过 import 自
// user-provider 的内部状态。`useCurrentUser()` 仅供组件调用。
// 注意：此函数不以 `use` 开头，因为它不是 React Hook，只是读取模块级快照。
function readCurrentUserSnapshot(): CurrentUserView | null {
  return getCurrentUserSnapshot();
}
