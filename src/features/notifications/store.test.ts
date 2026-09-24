import { afterEach, describe, expect, test } from "bun:test";
import { setApiFetchTransport } from "@/lib/api/result";
import type { Notification } from "@/lib/db/schema";
import {
  __resetNotificationsStoreForTests,
  clearAll,
  getNotificationsSnapshot,
  markAllRead,
  markRead,
  syncNotifications,
} from "./store";

function mkNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    userId: "u1",
    title: "标题",
    content: "内容",
    type: "system",
    link: null,
    isRead: false,
    createdAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  } as Notification;
}

function envelope(notifications: Notification[], unreadCount: number): Response {
  return new Response(
    JSON.stringify({ ok: true, notifications, unreadCount }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => {
  setApiFetchTransport(null);
  __resetNotificationsStoreForTests();
});

describe("notifications store", () => {
  test("同账号并发 sync 去重，只发一次请求并落快照", async () => {
    let calls = 0;
    const list = [mkNotification()];
    setApiFetchTransport(async () => {
      calls += 1;
      return envelope(list, 1);
    });
    await Promise.all([syncNotifications("u1"), syncNotifications("u1")]);
    expect(calls).toBe(1);
    const snap = getNotificationsSnapshot();
    expect(snap.userId).toBe("u1");
    expect(snap.notifications).toEqual(list);
    expect(snap.unreadCount).toBe(1);
    expect(snap.loaded).toBe(true);
  });

  test("userId 为 null 时清空快照", async () => {
    setApiFetchTransport(async () => envelope([mkNotification()], 1));
    await syncNotifications("u1");
    await syncNotifications(null);
    const snap = getNotificationsSnapshot();
    expect(snap).toEqual({ userId: null, notifications: [], unreadCount: 0, loaded: false });
  });

  test("markRead 应用服务端信封", async () => {
    const readList = [mkNotification({ isRead: true })];
    setApiFetchTransport(async () => envelope(readList, 0));
    await syncNotifications("u1");
    expect(await markRead("n1")).toBe(true);
    expect(getNotificationsSnapshot().unreadCount).toBe(0);
    expect(getNotificationsSnapshot().notifications[0]?.isRead).toBe(true);
  });

  test("markAllRead 应用服务端信封", async () => {
    setApiFetchTransport(async () => envelope([mkNotification({ isRead: true })], 0));
    await syncNotifications("u1");
    expect(await markAllRead()).toBe(true);
    expect(getNotificationsSnapshot().unreadCount).toBe(0);
  });

  test("clearAll 清空列表与未读", async () => {
    let mode: "list" | "clear" = "list";
    setApiFetchTransport(async () => {
      if (mode === "list") return envelope([mkNotification()], 1);
      return envelope([], 0);
    });
    await syncNotifications("u1");
    mode = "clear";
    expect(await clearAll()).toBe(true);
    const snap = getNotificationsSnapshot();
    expect(snap.notifications).toEqual([]);
    expect(snap.unreadCount).toBe(0);
  });

  test("无归属账号时动作直接失败，不发请求", async () => {
    let calls = 0;
    setApiFetchTransport(async () => {
      calls += 1;
      return envelope([], 0);
    });
    expect(await markRead("n1")).toBe(false);
    expect(await markAllRead()).toBe(false);
    expect(await clearAll()).toBe(false);
    expect(calls).toBe(0);
  });

  test("HTTP 失败不改动快照", async () => {
    const list = [mkNotification()];
    let mode: "ok" | "fail" = "ok";
    setApiFetchTransport(async () => {
      if (mode === "ok") return envelope(list, 1);
      return new Response(JSON.stringify({ error: "boom" }), { status: 500 });
    });
    await syncNotifications("u1");
    mode = "fail";
    expect(await markAllRead()).toBe(false);
    expect(getNotificationsSnapshot().notifications).toEqual(list);
    expect(getNotificationsSnapshot().unreadCount).toBe(1);
  });
});
