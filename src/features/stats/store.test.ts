import { afterEach, describe, expect, test } from "bun:test";
import { setApiFetchTransport } from "@/lib/api/result";
import type { UserStats } from "@/lib/api/user-stats";
import {
  __resetStatsStoreForTests,
  applyStatsDelta,
  getStatsSnapshot,
  subscribeStats,
  syncStats,
} from "./store";

function statsFixture(overrides: Partial<UserStats> = {}): UserStats {
  return {
    streak: 3,
    todayCount: 2,
    weekCount: 5,
    totalCompleted: 10,
    activeTaskCount: 1,
    learnDays: 7,
    totalGoals: 4,
    ...overrides,
  };
}

function statsResponse(stats: UserStats): Response {
  return new Response(JSON.stringify(stats), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  setApiFetchTransport(null);
  __resetStatsStoreForTests();
});

describe("stats store", () => {
  test("同账号并发 syncStats 去重，只发一次请求", async () => {
    let calls = 0;
    setApiFetchTransport(async () => {
      calls += 1;
      return statsResponse(statsFixture());
    });
    await Promise.all([syncStats("u1"), syncStats("u1")]);
    expect(calls).toBe(1);
    expect(getStatsSnapshot().stats?.totalCompleted).toBe(10);
    await syncStats("u1");
    expect(calls).toBe(1);
  });

  test("userId 为 null 时清空快照", async () => {
    setApiFetchTransport(async () => statsResponse(statsFixture()));
    await syncStats("u1");
    syncStats(null);
    expect(getStatsSnapshot()).toEqual({ userId: null, stats: null });
  });

  test("applyStatsDelta 累加并夹到 0，返回新的 totalCompleted", async () => {
    setApiFetchTransport(async () => statsResponse(statsFixture({ totalCompleted: 1, todayCount: 0 })));
    await syncStats("u1");
    expect(applyStatsDelta({ totalCompleted: 1, todayCount: 1 })).toBe(2);
    expect(getStatsSnapshot().stats?.todayCount).toBe(1);
    expect(applyStatsDelta({ totalCompleted: -5, todayCount: -5 })).toBe(0);
    const snap = getStatsSnapshot().stats;
    expect(snap?.totalCompleted).toBe(0);
    expect(snap?.todayCount).toBe(0);
  });

  test("未加载时 applyStatsDelta 返回 null 且不改快照", () => {
    const before = getStatsSnapshot();
    expect(applyStatsDelta({ totalCompleted: 1 })).toBeNull();
    expect(getStatsSnapshot()).toBe(before);
  });

  test("慢响应不覆盖已切换账号的快照", async () => {
    let resolveFirst: (res: Response) => void = () => {};
    const firstPending = new Promise<Response>((r) => {
      resolveFirst = r;
    });
    let first = true;
    setApiFetchTransport(async () => {
      if (first) {
        first = false;
        return firstPending;
      }
      return statsResponse(statsFixture({ totalCompleted: 99 }));
    });
    const slow = syncStats("u1");
    await new Promise((r) => setTimeout(r, 0));
    await syncStats("u2");
    expect(getStatsSnapshot().userId).toBe("u2");
    resolveFirst(statsResponse(statsFixture({ totalCompleted: 10 })));
    await slow;
    expect(getStatsSnapshot().userId).toBe("u2");
    expect(getStatsSnapshot().stats?.totalCompleted).toBe(99);
  });

  test("订阅者收到变更通知，退订后不再回调", async () => {
    let notified = 0;
    const unsubscribe = subscribeStats(() => {
      notified += 1;
    });
    setApiFetchTransport(async () => statsResponse(statsFixture()));
    await syncStats("u1");
    expect(notified).toBe(1);
    unsubscribe();
    applyStatsDelta({ totalCompleted: 1 });
    expect(notified).toBe(1);
  });
});
