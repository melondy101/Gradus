"use client";

// 统一 API 契约（Phase 3 #22）：走 apiFetch 返回可判别 ApiResult，
// 服务端成功信封为 { ok: true, notifications, unreadCount }；
// 失败按 HTTP 状态建模（401/500 → ApiResult.ok=false），不再吞成空列表。

import { apiFetch, type ApiResult } from "./result";
import type { Notification } from "@/lib/db/schema";

export interface NotificationsResponse {
  ok: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export async function fetchNotifications(): Promise<ApiResult<NotificationsResponse>> {
  return apiFetch<NotificationsResponse>("/api/notifications");
}

export async function markNotificationRead(
  id?: string,
  all?: boolean,
): Promise<ApiResult<NotificationsResponse>> {
  return apiFetch<NotificationsResponse>("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id, all }),
  });
}

export async function clearNotifications(): Promise<ApiResult<NotificationsResponse>> {
  return apiFetch<NotificationsResponse>("/api/notifications", {
    method: "DELETE",
  });
}
