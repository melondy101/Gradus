import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  getSubtaskRecord,
  getTaskRecord,
  loadTasks,
  resetTasks,
} from "./store";
import {
  deleteTaskMutation,
  postponeSubtaskMutation,
  toggleSubtaskMutation,
} from "./mutations";
import { __resetStatsStoreForTests } from "@/features/stats/store";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask, Task } from "@/lib/db/schema";

const realFetch = globalThis.fetch;
let route: (url: string, body: string) => Response = () => json(200, {});
let calls: { url: string; body: string }[] = [];

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const tick = () => new Promise((r) => setTimeout(r, 0));

interface NotifyCall {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function mkNotifier() {
  const seen: NotifyCall[] = [];
  return {
    seen,
    notify: (message: string, actionLabel?: string, onAction?: () => void) => {
      seen.push({ message, actionLabel, onAction });
    },
  };
}

function mkTask(over: Partial<Task> & { id: string; createdAt: string }): Task {
  return {
    userId: "u1",
    title: `任务 ${over.id}`,
    rawInput: null,
    tags: "[]",
    startDate: over.createdAt,
    status: "active",
    totalDays: 10,
    updatedAt: over.createdAt,
    ...over,
  } as unknown as Task;
}

function mkSub(over: Partial<Subtask> & { id: string; taskId: string }): Subtask {
  return {
    title: `步骤 ${over.id}`,
    description: null,
    durationDays: 3,
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
    ...over,
  } as unknown as Subtask;
}

const sample: TaskWithSubtasks[] = [
  {
    ...mkTask({ id: "t1", createdAt: "2026-01-02T00:00:00.000Z" }),
    subtasks: [
      mkSub({ id: "s1", taskId: "t1", sortOrder: 0, completed: true, completedAt: "2026-01-02T08:00:00.000Z" }),
      mkSub({ id: "s2", taskId: "t1", sortOrder: 1 }),
    ],
  },
  {
    ...mkTask({ id: "t2", createdAt: "2026-01-01T00:00:00.000Z" }),
    subtasks: [mkSub({ id: "s3", taskId: "t2", sortOrder: 0 })],
  },
];

const MSGS = {
  markDoneFailed: "markDoneFailed",
  markUndoneFailed: "markUndoneFailed",
  taskStatusFailed: "taskStatusFailed",
};

beforeEach(() => {
  calls = [];
  route = () => json(200, {});
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({ url, body });
    return route(url, body);
  }) as typeof fetch;
  resetTasks();
  __resetStatsStoreForTests();
  loadTasks(sample);
});

afterEach(() => {
  globalThis.fetch = realFetch;
  resetTasks();
  __resetStatsStoreForTests();
});

describe("toggleSubtaskMutation", () => {
  test("成功：store 乐观落定 completed，outcome.ok", async () => {
    const { notify, seen } = mkNotifier();
    const outcome = await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: false,
      notify,
      messages: MSGS,
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.allDone).toBe(true); // s1 已完成 → 勾选 s2 即全完成
    expect(getSubtaskRecord("s2")!.completed).toBe(true);
    expect(seen).toHaveLength(0);
    expect(calls[0]!.url).toBe("/api/tasks/t1/subtasks/s2");
    expect(JSON.parse(calls[0]!.body)).toEqual({ completed: true });
  });

  test("allDone 级联大任务状态为 done 并 PATCH 任务", async () => {
    await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: false,
      notify: () => {},
      messages: MSGS,
    });
    expect(getTaskRecord("t1")!.status).toBe("done");
    expect(calls.some((c) => c.url === "/api/tasks/t1" && c.body.includes("done"))).toBe(true);
  });

  test("取消勾选：done 任务回退 active", async () => {
    loadTasks([
      {
        ...mkTask({ id: "t1", createdAt: "2026-01-02T00:00:00.000Z", status: "done" }),
        subtasks: [
          mkSub({ id: "s1", taskId: "t1", completed: true, completedAt: "2026-01-02T08:00:00.000Z" }),
          mkSub({ id: "s2", taskId: "t1", completed: true, completedAt: "2026-01-02T09:00:00.000Z" }),
        ],
      },
    ]);
    await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: true,
      notify: () => {},
      messages: MSGS,
    });
    expect(getTaskRecord("t1")!.status).toBe("active");
  });

  test("API 失败：回滚 completed 并给出可见错误", async () => {
    route = (url) => (url.includes("/subtasks/") ? json(500, { error: "boom" }) : json(200, {}));
    const { notify, seen } = mkNotifier();
    const outcome = await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: false,
      notify,
      messages: MSGS,
    });
    expect(outcome.ok).toBe(false);
    expect(getSubtaskRecord("s2")!.completed).toBe(false);
    expect(seen[0]!.message).toBe("markDoneFailed");
  });

  test("状态级联失败只回滚任务状态，子任务勾选保留", async () => {
    route = (url) => (url === "/api/tasks/t1" ? json(500, { error: "boom" }) : json(200, {}));
    const { notify, seen } = mkNotifier();
    const outcome = await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: false,
      notify,
      messages: MSGS,
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.allDone).toBe(true);
    expect(getSubtaskRecord("s2")!.completed).toBe(true);
    expect(getTaskRecord("t1")!.status).toBe("active");
    expect(seen.some((s) => s.message === "taskStatusFailed")).toBe(true);
  });

  test("patchPanel 在乐观与回滚两侧都被调用", async () => {
    route = () => json(500, { error: "boom" });
    const panel: boolean[] = [];
    await toggleSubtaskMutation({
      taskId: "t1",
      subtaskId: "s2",
      current: false,
      notify: () => {},
      messages: MSGS,
      patchPanel: (_t, _s, completed) => panel.push(completed),
    });
    expect(panel).toEqual([true, false]);
  });
});

describe("postponeSubtaskMutation", () => {
  const MSGS_P = { done: "done", failed: "failed", undoFailed: "undoFailed", undoLabel: "undo" };

  test("成功：startDay+1，toast 带撤销入口；撤销恢复", async () => {
    const { notify, seen } = mkNotifier();
    await postponeSubtaskMutation({ taskId: "t1", subtaskId: "s2", notify, messages: MSGS_P });
    expect(getSubtaskRecord("s2")!.startDay).toBe(1);
    expect(seen[0]!.message).toBe("done");
    expect(seen[0]!.actionLabel).toBe("undo");

    seen[0]!.onAction!();
    await tick();
    expect(getSubtaskRecord("s2")!.startDay).toBe(0);
    expect(calls.some((c) => c.body.includes("unpostpone"))).toBe(true);
  });

  test("API 失败：回滚 startDay 并提示", async () => {
    route = () => json(500, { error: "boom" });
    const { notify, seen } = mkNotifier();
    await postponeSubtaskMutation({ taskId: "t1", subtaskId: "s2", notify, messages: MSGS_P });
    expect(getSubtaskRecord("s2")!.startDay).toBe(0);
    expect(seen[0]!.message).toBe("failed");
    expect(seen[0]!.actionLabel).toBeUndefined();
  });

  test("撤销 API 失败：恢复顺延结果并提示 undoFailed", async () => {
    let unpostponeFailed = false;
    route = () => {
      if (unpostponeFailed) return json(500, { error: "boom" });
      return json(200, {});
    };
    const { notify, seen } = mkNotifier();
    await postponeSubtaskMutation({ taskId: "t1", subtaskId: "s2", notify, messages: MSGS_P });
    unpostponeFailed = true;
    seen[0]!.onAction!();
    await tick();
    expect(getSubtaskRecord("s2")!.startDay).toBe(1);
    expect(seen.some((s) => s.message === "undoFailed")).toBe(true);
  });
});

describe("deleteTaskMutation", () => {
  test("成功：store 级联删除", async () => {
    const res = await deleteTaskMutation("t1");
    expect(res.ok).toBe(true);
    expect(getTaskRecord("t1")).toBeUndefined();
    expect(getSubtaskRecord("s1")).toBeUndefined();
    expect(getSubtaskRecord("s2")).toBeUndefined();
    expect(getSubtaskRecord("s3")).toBeDefined();
  });

  test("失败：返回错误文案且 store 不动", async () => {
    route = () => json(400, { error: "任务不存在" });
    const res = await deleteTaskMutation("missing");
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toBe("任务不存在");
    expect(getTaskRecord("t1")).toBeDefined();
  });
});
