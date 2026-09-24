import { describe, expect, it } from "bun:test";
import { getTasksSnapshot, loadTasks, patchSubtask, resetTasks } from "./store";
import { diffDays } from "@/lib/dates";
import type { TaskWithSubtasks } from "@/lib/api/tasks";

function localDay(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function fixtureTask(over: Partial<TaskWithSubtasks> & { id: string; startDate: Date | null }): TaskWithSubtasks {
  return {
    userId: "u1",
    title: `任务 ${over.id}`,
    rawInput: null,
    tags: "[]",
    status: "active",
    totalDays: 10,
    createdAt: localDay(2026, 9, 1),
    updatedAt: localDay(2026, 9, 1),
    subtasks: [],
    ...over,
  } as TaskWithSubtasks;
}

describe("tasks store absolute 日期派生", () => {
  resetTasks();
  loadTasks([
    fixtureTask({
      id: "task-b",
      startDate: localDay(2026, 10, 1),
      subtasks: [
        { id: "sb1", taskId: "task-b", title: "B首", startDay: 0, durationDays: 2, sortOrder: 0 } as never,
      ],
    }),
    fixtureTask({
      id: "task-a",
      startDate: localDay(2026, 9, 10),
      subtasks: [
        { id: "sa1", taskId: "task-a", title: "A首", startDay: 5, durationDays: 3, sortOrder: 0 } as never,
      ],
    }),
    fixtureTask({
      id: "task-n",
      startDate: null,
      subtasks: [
        { id: "sn1", taskId: "task-n", title: "无排期", startDay: 1, durationDays: 1, sortOrder: 0 } as never,
      ],
    }),
  ]);

  const rows = getTasksSnapshot().subtaskRows;
  const byId = new Map(rows.map((r) => [r.id, r]));

  it("absoluteStart/End = taskStartDate + startDay / +durationDays-1（自然日）", () => {
    const a = byId.get("sa1")!;
    expect(diffDays(localDay(2026, 9, 10), new Date(a.absoluteStart!))).toBe(5);
    expect(diffDays(localDay(2026, 9, 10), new Date(a.absoluteEnd!))).toBe(7);
    const b = byId.get("sb1")!;
    expect(diffDays(localDay(2026, 10, 1), new Date(b.absoluteStart!))).toBe(0);
    expect(diffDays(localDay(2026, 10, 1), new Date(b.absoluteEnd!))).toBe(1);
  });

  it("无 startDate 的任务派生为 null，不进 absolute 语义", () => {
    const n = byId.get("sn1")!;
    expect(n.absoluteStart).toBeNull();
    expect(n.absoluteEnd).toBeNull();
  });

  it("跨任务先后由 absoluteStart 决定，而非裸 startDay 偏移", () => {
    // A 的 startDay=5 > B 的 startDay=0，但 A 实际开始（09-15）早于 B（10-01）
    const sorted = [...rows]
      .filter((r) => r.absoluteStart)
      .sort((x, y) => new Date(x.absoluteStart!).getTime() - new Date(y.absoluteStart!).getTime());
    expect(sorted.map((r) => r.id)).toEqual(["sa1", "sb1"]);
  });

  it("postpone 语义：patchSubtask 改 startDay 后 absolute 随派生同步", () => {
    patchSubtask("sa1", { startDay: 6 });
    const a = getTasksSnapshot().subtaskRows.find((r) => r.id === "sa1")!;
    expect(diffDays(localDay(2026, 9, 10), new Date(a.absoluteStart!))).toBe(6);
  });
});
