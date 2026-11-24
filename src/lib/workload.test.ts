import { expect, test } from "bun:test";

import {
  DEFAULT_DAILY_HOURS,
  dailyHoursTotal,
  deepHoursOf,
  durationDaysOf,
  planTotalHours,
  totalHoursOf,
} from "@/lib/workload";

/** FB-02：工时口径唯一真源 */
test("deep_work_hours 是每日值，总工时 = 每日 × 工期", () => {
  expect(deepHoursOf({ durationDays: 3, deepWorkHours: 1.5 }).hours).toBe(1.5);
  expect(totalHoursOf({ durationDays: 3, deepWorkHours: 1.5 })).toBe(4.5);
  expect(totalHoursOf({ durationDays: 1, deepWorkHours: 3 })).toBe(3);
});

test("缺 deep_work_hours 时按每日 1.5 小时兜底并标记为估算", () => {
  const estimated = deepHoursOf({ durationDays: 2, deepWorkHours: null });
  expect(estimated.hours).toBe(DEFAULT_DAILY_HOURS);
  expect(estimated.estimated).toBe(true);
  expect(deepHoursOf({ durationDays: 2, deepWorkHours: 2 }).estimated).toBe(false);
});

test("工期缺失或非法时按 1 天处理", () => {
  expect(durationDaysOf({ durationDays: null })).toBe(1);
  expect(durationDaysOf({ durationDays: 0 })).toBe(1);
  expect(durationDaysOf({ durationDays: 4 })).toBe(4);
  expect(totalHoursOf({ durationDays: null, deepWorkHours: 2 })).toBe(2);
});

test("计划总工时 = Σ 子任务总工时，当日工时 = Σ 每日工时", () => {
  const rows = [
    { durationDays: 2, deepWorkHours: 1.5 },
    { durationDays: 3, deepWorkHours: 2 },
    { durationDays: 1, deepWorkHours: 1 },
  ];
  expect(planTotalHours(rows)).toBe(10);
  expect(dailyHoursTotal(rows)).toBe(4.5);
});
