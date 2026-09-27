import { expect, test } from "bun:test";

import { getTimelineDayCount } from "./timeline-window";

test("keeps a 30-day minimum timeline window", () => {
  expect(getTimelineDayCount(new Date("2026-09-01"), new Date("2026-09-12"))).toBe(30);
});

test("keeps the complete range for a 90-day plan", () => {
  expect(getTimelineDayCount(new Date("2026-09-01"), new Date("2026-11-29"))).toBe(90);
});
