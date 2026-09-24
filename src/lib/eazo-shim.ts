"use client";

// Self-hosted drop-in shim for @eazo/sdk / @eazo/sdk/react.
//
// AutoTask was originally built to run inside the Eazo platform. After we
// moved to JWT cookie sessions (see docs/plans/2026-08-14-multi-user-isolation.md)
// the shim no longer owns auth state — it just surfaces the user that the
// server-injected <UserProvider> supplies, so all existing `useEazo(...)`
// and `auth.*` consumers keep working without code changes.

import {
  useCurrentUser,
  updateCurrentUser,
  getCurrentUserSnapshot,
} from "@/lib/auth/user-provider";
import { fetchMe, logoutSession } from "@/lib/api/auth";
import type { CurrentUserView } from "@/lib/auth/current-user";
import type { User } from "@/lib/db/schema";

export type { User, CurrentUserView };

/**
 * Adapter: `CurrentUserView` (auth/current-user.ts) → `User` (db schema).
 *
 * The two are structurally identical for the fields UI cares about
 * (id/name/email). avatarUrl/passwordHash/emailLower/createdAt/updatedAt are
 * filled with safe placeholders; nothing in the UI currently reads them off
 * this path.
 */
// 缓存上一次适配结果，按 id/email/name 判定是否复用同一对象引用。
// 关键：useEazo(s => s.auth.user) 在每次渲染都会调用 adaptUser，若不缓存，
// 每次都返回新 User 对象 → 所有把 user 放进 useEffect 依赖数组的组件都会在
// 每次渲染后重跑 effect，形成“渲染→拉取→setState→渲染”的无限循环
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
    watchaOpenId: null,
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

type EazoState = {
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
 * Selector hook — preserves the existing @eazo/sdk/react API surface
 * (`useEazo((s) => s.auth.user)`) so we don't have to rewrite every
 * consumer. Internally it just reads the SSR-injected user.
 */
export function useEazo<T>(selector: (s: EazoState) => T): T {
  const user = adaptUser(useCurrentUser());
  const state: EazoState = {
    auth: {
      user,
      authenticated: user !== null,
    },
    device: { platform: "web" },
  };
  return selector(state);
}

/**
 * Auth singleton — mirrors `@eazo/sdk`'s `auth.login()` / `auth.logout()` /
 * `auth.user` API.
 *
 * Note: `auth.user` 是一次性读快照，并不是 reactive 的；要订阅用
 * `useEazo(s => s.auth.user)` 即可。
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

/** Mirrors `@eazo/sdk`'s `memory` singleton. */
export const memory = {
  async reportAction(_input: { content: string; event_type: string }): Promise<void> {
    // Platform-owned long-term memory is unavailable off-platform.
  },
};

/**
 * Drop-in for `@eazo/sdk/react`'s `EazoProvider` — a pure passthrough.
 */
export function EazoProvider({ children }: { children: React.ReactNode }) {
  return children;
}
