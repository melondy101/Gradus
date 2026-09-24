/**
 * tasks/subtasks 统一 mutation 层（Phase 3 · 审计报告 §store）。
 *
 * 首页与详情页的打卡 / 改期 / 删除全部走这里：乐观 patch store → 真实 API →
 * 失败 capture 回滚 + 可见错误 toast；改期成功提供撤销入口。
 * 纯函数 + 注入 notify，不依赖 React，可用 setApiFetchTransport 单测。
 */

import {
  deleteTask as apiDeleteTask,
  postponeSubtask as apiPostpone,
  toggleSubtask as apiToggle,
  unpostponeSubtask as apiUnpostpone,
  updateTaskStatusApi,
} from "@/lib/api/tasks";
import { applyStatsDelta, getStatsSnapshot } from "@/features/stats/store";
import {
  getSubtaskRecord,
  getTaskRecord,
  getTasksSnapshot,
  patchSubtask,
  patchTask,
  removeTask,
  upsertSubtask,
} from "./store";

export type Notify = (
  message: string,
  actionLabel?: string,
  onAction?: () => void,
) => void;

/** 打卡成功后由调用方消费的派生结果（祝贺弹窗、里程碑判定等 UI 副作用留在页面层）。 */
export interface ToggleOutcome {
  ok: boolean;
  /** 本次勾选使该任务全部子任务完成 */
  allDone: boolean;
  statsBefore: number | null;
  statsAfter: number | null;
  todayCountAfter: number | null;
}

const FAIL_OUTCOME: ToggleOutcome = {
  ok: false,
  allDone: false,
  statsBefore: null,
  statsAfter: null,
  todayCountAfter: null,
};

function sameDay(a: Date | string, b: Date | string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/**
 * 打卡（勾选/取消勾选）：乐观更新 store → API → 失败回滚。
 * 成功后按 store 真相判定 allDone 并级联大任务状态（done / 取消末条回退 active），
 * 状态级联写失败只回滚任务状态（子任务写入已在服务端生效，不能假装撤回），
 * 同时走 stats 本地增量（0 额外请求）。
 */
export async function toggleSubtaskMutation(opts: {
  taskId: string;
  subtaskId: string;
  /** 操作前服务端的 completed 值（乐观更新的基准） */
  current: boolean;
  notify: Notify;
  messages: {
    markDoneFailed: string;
    markUndoneFailed: string;
    taskStatusFailed: string;
  };
  /** AI 分析面板 entries 里自持的 task 副本同步（面板读 store 前过渡） */
  patchPanel?: (taskId: string, subtaskId: string, completed: boolean) => void;
}): Promise<ToggleOutcome> {
  const { taskId, subtaskId, current, notify, messages, patchPanel } = opts;
  const next = !current;
  const capture = getSubtaskRecord(subtaskId);

  patchSubtask(subtaskId, { completed: next });
  patchPanel?.(taskId, subtaskId, next);

  try {
    await apiToggle(taskId, subtaskId, next);
  } catch {
    if (capture) upsertSubtask(capture);
    else patchSubtask(subtaskId, { completed: current });
    patchPanel?.(taskId, subtaskId, current);
    notify(next ? messages.markDoneFailed : messages.markUndoneFailed);
    return FAIL_OUTCOME;
  }

  // 任务状态级联：基于 patch 后的 store 真相判断
  const task = getTaskRecord(taskId);
  const subs =
    getTasksSnapshot().taskList.find((t) => t.id === taskId)?.subtasks ?? [];
  const allDone =
    next && subs.length > 0 && subs.every((s) => s.completed);

  let targetStatus: "done" | "active" | null = null;
  if (allDone && task && task.status !== "done") targetStatus = "done";
  if (!next && task && task.status === "done") targetStatus = "active";
  if (targetStatus && task) {
    const prevStatus = task.status;
    patchTask(taskId, { status: targetStatus });
    try {
      await updateTaskStatusApi(taskId, targetStatus);
    } catch {
      patchTask(taskId, { status: prevStatus });
      notify(messages.taskStatusFailed);
    }
  }

  // stats 本地增量：与旧行为一致，取消勾选仅当原完成时间在今天才扣今日数
  let statsBefore: number | null = null;
  let statsAfter: number | null = null;
  let todayCountAfter: number | null = null;
  if (next) {
    statsBefore = getStatsSnapshot().stats?.totalCompleted ?? null;
    statsAfter = applyStatsDelta({ totalCompleted: 1, todayCount: 1 });
    todayCountAfter = getStatsSnapshot().stats?.todayCount ?? null;
  } else {
    const doneToday = !!capture?.completedAt && sameDay(capture.completedAt, new Date());
    statsAfter = applyStatsDelta({
      totalCompleted: -1,
      ...(doneToday ? { todayCount: -1 } : {}),
    });
  }
  return { ok: true, allDone, statsBefore, statsAfter, todayCountAfter };
}

/**
 * 顺延一天（跳过与改期共用）：乐观 startDay+1 → API → 失败回滚；
 * 成功 toast 带撤销入口，撤销失败同样回滚并提示。
 */
export async function postponeSubtaskMutation(opts: {
  taskId: string;
  subtaskId: string;
  notify: Notify;
  messages: {
    done: string;
    failed: string;
    undoFailed: string;
    undoLabel: string;
  };
}): Promise<void> {
  const { taskId, subtaskId, notify, messages } = opts;
  const capture = getSubtaskRecord(subtaskId);
  if (!capture) return;

  patchSubtask(subtaskId, { startDay: capture.startDay + 1 });
  const ok = await apiPostpone(taskId, subtaskId).then(() => true).catch(() => false);
  if (!ok) {
    upsertSubtask(capture);
    notify(messages.failed);
    return;
  }
  notify(messages.done, messages.undoLabel, () => {
    const cur = getSubtaskRecord(subtaskId);
    if (!cur) return;
    patchSubtask(subtaskId, { startDay: Math.max(0, cur.startDay - 1) });
    apiUnpostpone(taskId, subtaskId).catch(() => {
      upsertSubtask(cur);
      notify(messages.undoFailed);
    });
  });
}

/** 删除大任务（级联子任务）：API 成功后才动 store，失败返回错误文案。 */
export async function deleteTaskMutation(
  taskId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await apiDeleteTask(taskId);
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "删除失败，请稍后再试",
    };
  }
  removeTask(taskId);
  return { ok: true };
}
