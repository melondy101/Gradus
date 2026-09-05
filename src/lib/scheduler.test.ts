import { describe, expect, test } from "bun:test";
import {
  DOMAIN_AFFINITY_THRESHOLD,
  DOMAIN_PENALTY_MAX_SKIP,
  HIGH_BLOOM_THRESHOLD,
  MAX_SAME_TOPIC_PER_DAY,
  MAX_SUBTASKS_PER_DAY,
  REVIEW_INTERVAL_DAYS,
  SCHEDULING_WINDOW_DAYS,
  addDays,
  assessTaskDuration,
  canScheduleHighBloom,
  canScheduleTopic,
  computeDayAffinityScore,
  computeNewTaskStartDate,
  diffDays,
  findNextAvailableDay,
  hasDailyCapacity,
  isDomainCompatible,
  rankTasksByPriority,
  registerDailySlot,
  resolveDomainIndex,
  type DailySlot,
  type ScheduledTask,
  type TaskPriority,
  suggestReviewNodes,
  toDateStr,
  validateBloomSequence,
} from "./scheduler";

// ─── 日期工具 ─────────────────────────────────────────────────────────
describe("date utilities", () => {
  test("addDays 正向/负向/不改变原对象", () => {
    const base = new Date("2026-01-10T00:00:00Z");
    expect(toDateStr(addDays(base, 5))).toBe("2026-01-15");
    expect(toDateStr(addDays(base, -3))).toBe("2026-01-07");
    // 不可变：原对象未被修改
    expect(toDateStr(base)).toBe("2026-01-10");
  });

  test("addDays 跨月进位", () => {
    expect(toDateStr(addDays(new Date("2026-01-30T00:00:00Z"), 3))).toBe(
      "2026-02-02",
    );
  });

  test("toDateStr 取 ISO 日期部分", () => {
    expect(toDateStr(new Date("2026-06-15T23:59:00Z"))).toBe("2026-06-15");
  });

  test("diffDays 正/负/零", () => {
    const a = new Date("2026-03-01T00:00:00Z");
    const b = new Date("2026-03-08T00:00:00Z");
    expect(diffDays(a, b)).toBe(7);
    expect(diffDays(b, a)).toBe(-7);
    expect(diffDays(a, a)).toBe(0);
  });
});

// ─── 领域解析 ─────────────────────────────────────────────────────────
describe("resolveDomainIndex", () => {
  test("各领域关键词映射到正确索引", () => {
    expect(resolveDomainIndex("学习 Python 编程")).toBe(0);
    expect(resolveDomainIndex("微积分复习")).toBe(1);
    expect(resolveDomainIndex("英语写作")).toBe(2);
    expect(resolveDomainIndex("物理光学")).toBe(3);
    expect(resolveDomainIndex("哲学史")).toBe(4);
    expect(resolveDomainIndex("水彩绘画")).toBe(5);
    expect(resolveDomainIndex("力量健身")).toBe(6);
    expect(resolveDomainIndex("产品营销")).toBe(7);
  });

  test("大小写不敏感 (AI/web)", () => {
    expect(resolveDomainIndex("AI 模型")).toBe(0);
    expect(resolveDomainIndex("WEB 开发")).toBe(0);
  });

  test("无法识别返回 -1", () => {
    expect(resolveDomainIndex("随便写点什么")).toBe(-1);
    expect(resolveDomainIndex("")).toBe(-1);
  });
});

// ─── 领域亲和度 ───────────────────────────────────────────────────────
describe("computeDayAffinityScore", () => {
  test("空日返回满分 1.0", () => {
    expect(computeDayAffinityScore("编程", [])).toBe(1.0);
  });

  test("新主题不可识别返回 1.0（不受约束）", () => {
    expect(computeDayAffinityScore("未知主题", ["编程"])).toBe(1.0);
  });

  test("同领域亲和度为 1.0", () => {
    expect(computeDayAffinityScore("编程", ["代码"])).toBe(1.0);
  });

  test("取与所有已排主题的最低亲和度", () => {
    // 编程(0) vs 健身(6)=0.1, vs 数学(1)=0.85 → 最低 0.1
    expect(computeDayAffinityScore("编程", ["健身", "数学"])).toBeCloseTo(0.1);
  });

  test("已排主题不可识别时被跳过", () => {
    // 只有"数学"可识别：编程(0) vs 数学(1)=0.85
    expect(computeDayAffinityScore("编程", ["无关词", "数学"])).toBeCloseTo(
      0.85,
    );
  });
});

// ─── 接续排期 ─────────────────────────────────────────────────────────
describe("computeNewTaskStartDate", () => {
  const today = new Date("2026-05-01T00:00:00Z");
  const mk = (startDate: Date, totalDays: number): ScheduledTask => ({
    taskId: "t",
    startDate,
    totalDays,
    priorityScore: 1,
    topicCategory: "编程",
    createdAt: today,
  });

  test("无活跃任务从今天开始", () => {
    expect(computeNewTaskStartDate([], today)).toEqual(today);
  });

  test("totalDays<=0 视为非活跃", () => {
    expect(computeNewTaskStartDate([mk(today, 0)], today)).toEqual(today);
  });

  test("接续到最末结束日 +1 天", () => {
    // start=today, 2天 → end=today+2 → 新任务=today+3
    const res = computeNewTaskStartDate([mk(today, 2)], today);
    expect(toDateStr(res)).toBe("2026-05-04");
  });

  test("最末结束日超过窗口则回退到今天", () => {
    // 20 天远超 SCHEDULING_WINDOW_DAYS(7)
    const res = computeNewTaskStartDate([mk(today, 20)], today);
    expect(toDateStr(res)).toBe(toDateStr(today));
  });

  test("过去的任务不会把开始日排到今天之前", () => {
    const past = addDays(today, -10);
    const res = computeNewTaskStartDate([mk(past, 2)], today);
    expect(res >= today).toBe(true);
  });
});

// ─── 优先级排序 ───────────────────────────────────────────────────────
describe("rankTasksByPriority", () => {
  const today = new Date("2026-05-01T00:00:00Z");
  const mk = (p: Partial<TaskPriority> & { taskId: string }): TaskPriority => ({
    urgencyScore: 3,
    importanceScore: 3,
    topicCategory: "编程",
    totalDays: 1,
    ...p,
  });

  test("高象限分排前面", () => {
    const order = rankTasksByPriority(
      [
        mk({ taskId: "low", urgencyScore: 1, importanceScore: 1 }),
        mk({ taskId: "high", urgencyScore: 5, importanceScore: 5 }),
      ],
      today,
    );
    expect(order[0]).toBe("high");
  });

  test("Q2 战略加成让重要不紧急任务提升", () => {
    // A: u=2,i=4 → 8 + q2Bonus 5 = 13
    // B: u=3,i=3 → 9, 无加成
    const order = rankTasksByPriority(
      [
        mk({ taskId: "B", urgencyScore: 3, importanceScore: 3 }),
        mk({ taskId: "A_q2", urgencyScore: 2, importanceScore: 4 }),
      ],
      today,
    );
    expect(order[0]).toBe("A_q2");
  });

  test("递延惩罚：每超期 7 天 +8 分", () => {
    // base: u=2,i=2 → 4。超期 14 天 → floor(14/7)*8 = 16 → 20
    const overdue = mk({
      taskId: "overdue",
      urgencyScore: 2,
      importanceScore: 2,
      originalStartDate: addDays(today, -14),
    });
    // fresh: u=4,i=4 → 16，无超期
    const fresh = mk({ taskId: "fresh", urgencyScore: 4, importanceScore: 4 });
    const order = rankTasksByPriority([fresh, overdue], today);
    expect(order[0]).toBe("overdue");
  });

  test("空数组返回空", () => {
    expect(rankTasksByPriority([], today)).toEqual([]);
  });
});

// ─── 每日容量与约束 ───────────────────────────────────────────────────
describe("daily slot constraints", () => {
  const fresh = () => new Map<string, DailySlot>();

  test("hasDailyCapacity：未知日期有容量", () => {
    expect(hasDailyCapacity("2026-05-01", fresh())).toBe(true);
  });

  test("hasDailyCapacity：填满后无容量", () => {
    const slots = fresh();
    for (let i = 0; i < MAX_SUBTASKS_PER_DAY; i++) {
      registerDailySlot("2026-05-01", `topic${i}`, slots);
    }
    expect(hasDailyCapacity("2026-05-01", slots)).toBe(false);
  });

  test("canScheduleTopic：同主题达上限后拒绝", () => {
    const slots = fresh();
    for (let i = 0; i < MAX_SAME_TOPIC_PER_DAY; i++) {
      registerDailySlot("2026-05-01", "编程", slots);
    }
    expect(canScheduleTopic("2026-05-01", "编程", slots)).toBe(false);
    // 不同主题仍可排
    expect(canScheduleTopic("2026-05-01", "数学", slots)).toBe(true);
  });

  test("canScheduleHighBloom：低于阈值总是允许", () => {
    const slots = fresh();
    registerDailySlot("2026-05-01", "编程", slots, 5); // 已占一个高难度
    expect(
      canScheduleHighBloom("2026-05-01", HIGH_BLOOM_THRESHOLD - 1, slots),
    ).toBe(true);
  });

  test("canScheduleHighBloom：高难度达上限后拒绝", () => {
    const slots = fresh();
    registerDailySlot("2026-05-01", "编程", slots, HIGH_BLOOM_THRESHOLD);
    expect(
      canScheduleHighBloom("2026-05-01", HIGH_BLOOM_THRESHOLD, slots),
    ).toBe(false);
  });

  test("isDomainCompatible：空日兼容", () => {
    expect(isDomainCompatible("2026-05-01", "编程", fresh())).toBe(true);
  });

  test("isDomainCompatible：低亲和度不兼容", () => {
    const slots = fresh();
    registerDailySlot("2026-05-01", "健身", slots); // 健身(6) vs 编程(0)=0.1 < 0.4
    expect(isDomainCompatible("2026-05-01", "编程", slots)).toBe(false);
  });

  test("registerDailySlot：正确累加计数", () => {
    const slots = fresh();
    registerDailySlot("2026-05-01", "编程", slots, HIGH_BLOOM_THRESHOLD);
    registerDailySlot("2026-05-01", "编程", slots, 2);
    const slot = slots.get("2026-05-01")!;
    expect(slot.subtaskCount).toBe(2);
    expect(slot.topicCounts.get("编程")).toBe(2);
    expect(slot.highBloomCount).toBe(1); // 只有第一个 >= 阈值
    expect(slot.scheduledTopics).toEqual(["编程", "编程"]);
  });
});

// ─── 寻找最早可用日 ───────────────────────────────────────────────────
describe("findNextAvailableDay", () => {
  const start = new Date("2026-05-01T00:00:00Z");

  test("空槽位直接返回起始日", () => {
    const res = findNextAvailableDay(start, "编程", new Map());
    expect(toDateStr(res)).toBe("2026-05-01");
  });

  test("容量满时推到下一天", () => {
    const slots = new Map<string, DailySlot>();
    for (let i = 0; i < MAX_SUBTASKS_PER_DAY; i++) {
      registerDailySlot("2026-05-01", `t${i}`, slots);
    }
    const res = findNextAvailableDay(start, "编程", slots);
    expect(toDateStr(res)).toBe("2026-05-02");
  });

  test("软约束冲突在窗口内推迟", () => {
    // 首日排了健身，编程亲和度 0.1 < 0.4 → 第一轮推迟
    const slots = new Map<string, DailySlot>();
    registerDailySlot("2026-05-01", "健身", slots);
    const res = findNextAvailableDay(start, "编程", slots);
    expect(res > start).toBe(true);
    expect(diffDays(start, res)).toBeLessThanOrEqual(DOMAIN_PENALTY_MAX_SKIP + 1);
  });
});

// ─── Bloom 序列验证 ───────────────────────────────────────────────────
describe("validateBloomSequence", () => {
  test("少于 2 个节点总是合理", () => {
    expect(validateBloomSequence([])).toBe(true);
    expect(validateBloomSequence([4] as never)).toBe(true);
  });

  test("平滑上升序列合理", () => {
    expect(validateBloomSequence([1, 2, 3, 4, 5] as never)).toBe(true);
  });

  test("允许小幅回落（复盘）", () => {
    // 5 后回落到 3 = 差 2，未违规
    expect(validateBloomSequence([2, 3, 5, 3, 4] as never)).toBe(true);
  });

  test("大幅倒退超 30% 判为不合理", () => {
    // 达到 6 后连续大幅回落到 1（差 5 > 2）
    expect(validateBloomSequence([6, 1, 1] as never)).toBe(false);
  });
});

// ─── 复习节点建议 ─────────────────────────────────────────────────────
describe("suggestReviewNodes", () => {
  test("间隔不足不插入复习", () => {
    expect(
      suggestReviewNodes([{ startDay: 0, durationDays: 2 }]),
    ).toEqual([]);
  });

  test("达到复习间隔时插入节点", () => {
    const nodes = suggestReviewNodes([
      { startDay: 0, durationDays: REVIEW_INTERVAL_DAYS },
    ]);
    expect(nodes).toEqual([REVIEW_INTERVAL_DAYS]);
  });

  test("多段学习按间隔累积插入", () => {
    const nodes = suggestReviewNodes([
      { startDay: 0, durationDays: 3 },
      { startDay: 3, durationDays: 3 }, // endDay 6 >= 5 → 插入 6
      { startDay: 6, durationDays: 2 }, // endDay 8, 8-6=2 < 5 → 不插入
      { startDay: 8, durationDays: 3 }, // endDay 11, 11-6=5 → 插入 11
    ]);
    expect(nodes).toEqual([6, 11]);
  });
});

// ─── 工期评估 ─────────────────────────────────────────────────────────
describe("assessTaskDuration", () => {
  test("BRAC：超过每日上限建议拆分", () => {
    const res = assessTaskDuration(1, 3, 6); // 6h > 4.5h
    expect(res.ok).toBe(false);
    expect(res.recommendedDays).toBe(2); // ceil(6/4.5)=2
  });

  test("BRAC：工期不足推荐天数则不通过", () => {
    // 3h → 2 个 BRAC 块 → 推荐 2 天，但只给 1 天
    const res = assessTaskDuration(1, 3, 3);
    expect(res.ok).toBe(false);
    expect(res.recommendedDays).toBe(2);
  });

  test("BRAC：工期充足则通过", () => {
    const res = assessTaskDuration(2, 3, 3);
    expect(res.ok).toBe(true);
    expect(res.recommendedDays).toBe(2);
  });

  test("无 estimatedHours：工期过短", () => {
    expect(assessTaskDuration(0).ok).toBe(false);
  });

  test("无 estimatedHours：普通工期过长（Bloom<4 上限 5）", () => {
    const res = assessTaskDuration(6, 3);
    expect(res.ok).toBe(false);
    expect(res.suggestion).toContain("拆分");
  });

  test("无 estimatedHours：高 Bloom 允许更长工期（上限 7）", () => {
    expect(assessTaskDuration(6, 4).ok).toBe(true);
  });

  test("合理工期通过", () => {
    expect(assessTaskDuration(3, 3).ok).toBe(true);
  });
});

// ─── 常量健壮性 ───────────────────────────────────────────────────────
describe("constants sanity", () => {
  test("阈值处于合理范围", () => {
    expect(MAX_SUBTASKS_PER_DAY).toBeGreaterThan(0);
    expect(SCHEDULING_WINDOW_DAYS).toBeGreaterThan(0);
    expect(DOMAIN_AFFINITY_THRESHOLD).toBeGreaterThan(0);
    expect(DOMAIN_AFFINITY_THRESHOLD).toBeLessThan(1);
  });
});
