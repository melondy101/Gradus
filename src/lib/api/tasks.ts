import { request } from "@/lib/api/request";
import type { Task, Subtask } from "@/lib/db/schema";

export interface TaskWithProgress extends Task {
  subtaskCount: number;
  completedCount: number;
}

export interface TaskWithSubtasks extends Task {
  subtasks: Subtask[];
}

/** 子任务 + 所属大任务信息（用于左侧列表展开展示） */
export interface SubtaskWithTask extends Subtask {
  taskTitle: string;
  taskRawInput: string | null;
  taskTags?: string | null;      // 大任务标签（JSON 字符串）
  taskStartDate: string | null;  // ISO string from JSON，大任务开始日期
  taskStatus: string;
  taskCreatedAt: string;   // ISO string from JSON
}

export async function getTasks(): Promise<TaskWithProgress[]> {
  const res = await request("/api/tasks");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTasksWithSubtasks(): Promise<TaskWithSubtasks[]> {
  const res = await request("/api/tasks?withSubtasks=1");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSubtasksWithTask(): Promise<SubtaskWithTask[]> {
  const res = await request("/api/subtasks");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTask(id: string): Promise<TaskWithSubtasks> {
  const res = await request(`/api/tasks/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createTask(title: string, tags?: string[]): Promise<Task> {
  const res = await request("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, tags: tags || [] }),
  });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      msg = parsed.error || parsed.message || raw;
    } catch {
      // not json
    }
    throw new Error(msg || "创建任务失败");
  }
  return res.json();
}

export async function updateTaskTagsApi(
  taskId: string,
  tags: string[]
): Promise<string[]> {
  const res = await request(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.tags) ? data.tags : tags;
}

export async function updateTaskStatusApi(
  taskId: string,
  status: string
): Promise<void> {
  const res = await request(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteTask(id: string): Promise<void> {
  const res = await request(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string; message?: string };
      msg = parsed.error || parsed.message || raw;
    } catch {}
    throw new Error(msg || "删除任务失败");
  }
}

export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  completed: boolean
): Promise<void> {
  const res = await request(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error(await res.text());
}

/** 将子任务往后延迟一天（startDay += 1），返回更新后的 startDay */
export async function postponeSubtask(
  taskId: string,
  subtaskId: string
): Promise<number> {
  const res = await request(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "postpone" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json().catch(() => ({}));
  return typeof data.startDay === "number" ? data.startDay : 0;
}

/** 撤销延迟（startDay -= 1），返回更新后的 startDay */
export async function unpostponeSubtask(
  taskId: string,
  subtaskId: string
): Promise<number> {
  const res = await request(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unpostpone" }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json().catch(() => ({}));
  return typeof data.startDay === "number" ? data.startDay : 0;
}
