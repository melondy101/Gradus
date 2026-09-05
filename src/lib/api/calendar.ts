"use client";

import { request } from "./request";

export interface CalendarTokenResponse {
  ok: boolean;
  token?: string;
  feedUrl?: string;
  webcalUrl?: string;
  directDownloadUrl?: string;
  error?: string;
}

export async function getCalendarFeedInfo(): Promise<CalendarTokenResponse> {
  try {
    const res = await request("/api/calendar/token");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, error: err.error || "获取日历订阅失败" };
    }
    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "网络异常";
    return { ok: false, error: message };
  }
}
