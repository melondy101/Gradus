import { request } from "./request";
import type { Notification } from "@/lib/db/schema";

export interface NotificationsResponse {
  ok: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  const res = await request("/api/notifications");
  if (!res.ok) return { ok: false, notifications: [], unreadCount: 0 };
  return (await res.json()) as NotificationsResponse;
}

export async function markNotificationRead(id?: string, all?: boolean): Promise<NotificationsResponse> {
  const res = await request("/api/notifications", {
    method: "PATCH",
    body: JSON.stringify({ id, all }),
  });
  if (!res.ok) return { ok: false, notifications: [], unreadCount: 0 };
  return (await res.json()) as NotificationsResponse;
}

export async function clearNotifications(): Promise<NotificationsResponse> {
  const res = await request("/api/notifications", {
    method: "DELETE",
  });
  if (!res.ok) return { ok: false, notifications: [], unreadCount: 0 };
  return (await res.json()) as NotificationsResponse;
}
