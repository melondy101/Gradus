/**
 * tasks/subtasks 规范化单一来源（Phase 3 · 审计报告 §store）。
 *
 * 模块级 Map 存不可变记录；派生视图（taskList / subtaskRows）在每次 commit 时
 * 统一重算并生成新的不可变 snapshot 对象，保证 useSyncExternalStore 引用稳定。
 * 排序与服务端真相源一致：tasks 按 createdAt 降序，组内 subtasks 按 sortOrder 升序
 * （见 src/lib/db/queries/tasks.ts getTasksWithSubtasksByUser / getSubtasksWithTaskByUser）。
 * 不依赖 React；hooks 见 src/features/tasks/use-tasks.ts。
 */

import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask, Task } from "@/lib/db/schema";
import { addDays, toDate } from "@/lib/dates";

export interface TasksSnapshot {
  /** 大任务 + 其子任务（plans / 天梯视图消费） */
  taskList: TaskWithSubtasks[];
  /** 子任务 + 所属大任务 join 字段（今日步骤列表消费） */
  subtaskRows: SubtaskWithTask[];
}

const tasks = new Map<string, Task>();
const subtasks = new Map<string, Subtask>();
const listeners = new Set<() => void>();

let snapshot: TasksSnapshot = { taskList: [], subtaskRows: [] };

/** API JSON 里日期是 ISO 串、直读 DB 时是 Date，两者都归一为 ISO 串（幂等）。 */
function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function recompute(): void {
  const sorted = [...tasks.values()].sort(
    (a, b) => new Date(toIso(b.createdAt)).getTime() - new Date(toIso(a.createdAt)).getTime()
  );
  const byTask = new Map<string, Subtask[]>();
  for (const s of subtasks.values()) {
    if (!tasks.has(s.taskId)) continue; // 孤儿子任务不进派生视图
    const arr = byTask.get(s.taskId);
    if (arr) arr.push(s);
    else byTask.set(s.taskId, [s]);
  }
  const taskList: TaskWithSubtasks[] = [];
  const subtaskRows: SubtaskWithTask[] = [];
  for (const t of sorted) {
    const subs = (byTask.get(t.id) ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
    taskList.push({ ...t, subtasks: subs });
    const taskStart = t.startDate == null ? null : toIso(t.startDate);
    const base = toDate(taskStart);
    for (const s of subs) {
      subtaskRows.push({
        ...s,
        taskTitle: t.title,
        taskRawInput: t.rawInput,
        taskTags: t.tags,
        taskStartDate: taskStart,
        taskStatus: t.status,
        taskCreatedAt: toIso(t.createdAt),
        // absolute 日期语义出层：跨任务排序/布局只消费这两个字段，不碰裸 startDay 偏移
        absoluteStart: base ? addDays(base, s.startDay).toISOString() : null,
        absoluteEnd: base
          ? addDays(base, s.startDay + Math.max(s.durationDays, 1) - 1).toISOString()
          : null,
      });
    }
  }
  snapshot = { taskList, subtaskRows };
}

function commit(): void {
  recompute();
  listeners.forEach((l) => l());
}

// ── 读 ───────────────────────────────────────────────────────────────

export function getTasksSnapshot(): TasksSnapshot {
  return snapshot;
}

export function getTaskRecord(id: string): Task | undefined {
  return tasks.get(id);
}

export function getSubtaskRecord(id: string): Subtask | undefined {
  return subtasks.get(id);
}

export function subscribeTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── 写（全部幂等 upsert / 无副作用；乐观更新的回滚 = 先 capture 再 upsert 还原） ──

/** 整表加载（?withSubtasks=1 单请求即可重建全部派生字段）。 */
export function loadTasks(list: TaskWithSubtasks[]): void {
  tasks.clear();
  subtasks.clear();
  for (const t of list) {
    const { subtasks: subs, ...task } = t;
    tasks.set(task.id, task as Task);
    for (const s of subs) subtasks.set(s.id, s);
  }
  commit();
}

export function upsertTask(task: Task): void {
  tasks.set(task.id, task);
  commit();
}

export function patchTask(id: string, patch: Partial<Task>): void {
  const cur = tasks.get(id);
  if (!cur) return;
  tasks.set(id, { ...cur, ...patch });
  commit();
}

export function upsertSubtask(sub: Subtask): void {
  subtasks.set(sub.id, sub);
  commit();
}

export function patchSubtask(id: string, patch: Partial<Subtask>): void {
  const cur = subtasks.get(id);
  if (!cur) return;
  subtasks.set(id, { ...cur, ...patch });
  commit();
}

export function removeTask(id: string): void {
  if (!tasks.delete(id)) return;
  for (const [sid, s] of subtasks) {
    if (s.taskId === id) subtasks.delete(sid);
  }
  commit();
}

/** 详情页单任务水化：upsert 大任务并整组替换其子任务。 */
export function upsertTaskWithSubtasks(t: TaskWithSubtasks): void {
  const { subtasks: subs, ...task } = t;
  tasks.set(task.id, task as Task);
  setSubtasksForTask(task.id, subs);
}

/** AI 分析完成 / 重新生成排期后，整组替换某任务的子任务。 */
export function setSubtasksForTask(taskId: string, list: Subtask[]): void {
  for (const [sid, s] of subtasks) {
    if (s.taskId === taskId) subtasks.delete(sid);
  }
  for (const s of list) subtasks.set(s.id, s);
  commit();
}

/** 切换账号时清空，防止跨账号残留。 */
export function resetTasks(): void {
  tasks.clear();
  subtasks.clear();
  commit();
}
