import { expect, test } from "bun:test";

import { DAILY_CREDITS, TRIAL_CREDITS, nextBeijingMidnight } from "@/lib/commerce/credits";

/**
 * FB-03：额度模型
 *
 * 这里只覆盖纯逻辑部分（常量与日界计算）；真正的扣减链在 reserveAiCredit 里，
 * 依赖数据库事务，由集成环境验证。
 */
test("试用额度 3 次、每日刷新 1 次", () => {
  expect(TRIAL_CREDITS).toBe(3);
  expect(DAILY_CREDITS).toBe(1);
});

test("每日额度按东八区次日零点过期", () => {
  const midnight = nextBeijingMidnight(new Date("2026-11-24T05:00:00.000Z")); // 13:00 北京时间
  expect(midnight.toISOString()).toBe("2026-11-24T16:00:00.000Z"); // 次日 00:00 +08
  expect(midnight.getTime()).toBeGreaterThan(new Date("2026-11-24T05:00:00.000Z").getTime());
});

test("东八区零点前后跨日计算正确", () => {
  // 2026-11-24T15:59Z = 2026-11-24 23:59 +08 → 过期点是 11-25 00:00 +08
  const justBefore = nextBeijingMidnight(new Date("2026-11-24T15:59:00.000Z"));
  expect(justBefore.toISOString()).toBe("2026-11-24T16:00:00.000Z");
  // 2026-11-24T16:01Z = 2026-11-25 00:01 +08 → 过期点是 11-26 00:00 +08
  const justAfter = nextBeijingMidnight(new Date("2026-11-24T16:01:00.000Z"));
  expect(justAfter.toISOString()).toBe("2026-11-25T16:00:00.000Z");
});
