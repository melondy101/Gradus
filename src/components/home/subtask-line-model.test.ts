import { expect, test } from "bun:test";

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { bloomOf } from "@/components/home/subtask-line-model";
import { levelGroupsOf } from "@/components/home/steps-level-model";

function row(patch: Partial<SubtaskWithTask>): SubtaskWithTask {
  return {
    id: "s1",
    taskId: "t1",
    title: "子任务",
    description: null,
    durationDays: 1,
    startDay: 0,
    completed: false,
    sortOrder: 0,
    resources: null,
    topic: null,
    urgency: null,
    importance: null,
    keywords: null,
    completedAt: null,
    bloomLevel: null,
    deepWorkHours: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    taskTitle: "计划",
    taskRawInput: null,
    taskTags: "[]",
    taskStartDate: null,
    taskStatus: "active",
    taskCreatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  } as SubtaskWithTask;
}

/** FB-01：认知层级判定必须是单一真相源 */
test("bloomLevel 存在时无视 urgency（urgency 是任务级共享分数）", () => {
  const r = row({ bloomLevel: 2, urgency: 4 });
  const { level, known } = bloomOf(r);
  expect(level).toBe(2);
  expect(known).toBe(true);

  const high = row({ bloomLevel: 5, urgency: 4 });
  expect(bloomOf(high).level).toBe(5);
});

test("bloomLevel 缺失时标记为未标注，不再假装一个层级", () => {
  const { known } = bloomOf(row({ bloomLevel: null, urgency: 4 }));
  expect(known).toBe(false);
  expect(bloomOf(row({ bloomLevel: null, urgency: null })).known).toBe(false);
});

test("天梯分组层级与卡片标签层级始终一致", () => {
  const rows = [
    row({ id: "a", bloomLevel: 2 }),
    row({ id: "b", bloomLevel: 2 }),
    row({ id: "c", bloomLevel: 3 }),
    row({ id: "d", bloomLevel: null, urgency: 4 }),
  ];
  const groups = levelGroupsOf(rows);
  const grouped = groups.flatMap((g) => g.items);
  for (const item of grouped) {
    const group = groups.find((g) => g.items.includes(item));
    expect(group?.level).toBe(bloomOf(item).level);
  }
  // 未标注层级的子任务不进任何台阶
  expect(grouped.map((i) => i.id)).not.toContain("d");
  expect(groups.find((g) => g.level === 2)?.totalCount).toBe(2);
  expect(groups.find((g) => g.level === 3)?.totalCount).toBe(1);
});
