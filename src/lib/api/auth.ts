"use client";

// auth 族 typed client（审计 §4.4：消灭 auth-modal / auth-shim 里的 4 处裸 fetch）。
// 服务端这些端点用 { ok, error } JSON 信封表达业务失败，HTTP 状态另有语义
// （429 限流等），这里原样透出 ApiResult 由调用方分支。

import { apiFetch, type ApiResult } from "@/lib/api/result";
import type { CurrentUserView } from "@/lib/auth/current-user";

export interface AuthConfig {
  ok?: boolean;
  watchaEnabled?: boolean;
  emailConfigured?: boolean;
  emailProvider?: "qq" | "smtp" | "mock";
  emailVerificationEnabled?: boolean;
}

export interface SendCodeResult {
  ok?: boolean;
  message?: string;
  error?: string;
  waitSeconds?: number;
  devCode?: string;
}

export interface CredentialAuthResult {
  ok?: boolean;
  user?: { id: string; name: string; email: string };
  merged?: boolean;
  error?: string;
}

export interface MeResult {
  ok?: boolean;
  user?: CurrentUserView;
  error?: string;
}

export function getAuthConfig(): Promise<ApiResult<AuthConfig>> {
  return apiFetch<AuthConfig>("/api/auth/config", { cache: "no-store" });
}

export function sendEmailCode(
  email: string,
  type: "register" = "register",
): Promise<ApiResult<SendCodeResult>> {
  return apiFetch<SendCodeResult>("/api/auth/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, type }),
  });
}

export function loginWithCredentials(
  email: string,
  password: string,
): Promise<ApiResult<CredentialAuthResult>> {
  return apiFetch<CredentialAuthResult>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function registerWithCredentials(input: {
  name: string;
  email: string;
  password: string;
  code: string;
}): Promise<ApiResult<CredentialAuthResult>> {
  return apiFetch<CredentialAuthResult>("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function logoutSession(): Promise<ApiResult<unknown>> {
  return apiFetch("/api/auth/logout", { method: "POST" });
}

/** /api/auth/me：非 2xx 时若信封是「账号不存在」，调用方需清掉本地登录态。 */
export async function fetchMe(): Promise<
  ApiResult<MeResult> & { accountMissing?: boolean }
> {
  const res = await apiFetch<MeResult>("/api/auth/me", { cache: "no-store" });
  if (res.ok) return res;
  // apiFetch 的 http 错误分支已解析并透传 JSON 信封（见 result.ts）
  if (res.kind === "http" && (res.data as MeResult | undefined)?.error === "账号不存在") {
    return { ...res, accountMissing: true };
  }
  return res;
}
