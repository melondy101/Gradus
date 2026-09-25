"use client";

import { getResolvedLocale } from "@/i18n";

/**
 * Drop-in replacement for `fetch`。
 *
 * Self-hosted mode：浏览器自动带上 `__Host-session` cookie，无需客户端
 * 显式注入任何 session header。这个 helper 只做一件事——给所有请求加
 * `x-app-locale` 头（i18n）。
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-app-locale", getResolvedLocale());

  return fetch(input, { ...init, headers });
}
