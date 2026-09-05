"use client";

import { auth } from "@/lib/eazo-shim";
import { getResolvedLocale } from "@/i18n";
import { appAIRequest } from "@/lib/api/app-ai-request";

/**
 * Drop-in replacement for `fetch`.
 *
 * Self-hosted mode: 浏览器自动带上 `__Host-session` cookie，无需客户端
 * 显式注入任何 session header。`auth.getSessionHeader()` 现在恒返回 null。
 * 这个 helper 现在主要负责：
 *   1. 给所有请求加 `x-app-locale` 头（i18n）
 *   2. 统一处理"App AI 不可用"的 toast 提示（通过 `appAIRequest`）
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const sessionHeader = await auth.getSessionHeader();
  const headers = new Headers(init.headers);
  if (sessionHeader) headers.set("x-eazo-session", sessionHeader);
  headers.set("x-app-locale", getResolvedLocale());

  return appAIRequest(input, {
    ...init,
    headers,
  });
}
