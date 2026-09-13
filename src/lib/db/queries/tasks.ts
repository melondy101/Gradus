import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, subtasks } from "@/lib/db/schema";
import type { Task, Subtask } from "@/lib/db/schema";
import { memStore } from "../memory-store";
import { ensureSchema } from "../ensure-schema";

// ── Task with progress counts ─────────────────────────────────────────
export type TaskWithProgress = Task & {
  subtaskCount: number;
  completedCount: number;
};

// ── Subtask row enriched with parent task info ────────────────────────
export type SubtaskWithTask = Subtask & {
  taskTitle: string;
  taskRawInput: string | null;
  taskStartDate: Date | null;  // 大任务开始日期
  taskStatus: string;
  taskCreatedAt: Date;
};

/**
 * 数据库操作重试封装（防止长时 AI 生成过程中连接池 socket 被远端 Neon/Supabase 闲置中断）
 */
async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 300): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < retries) {
        console.warn(`[db] Mutation attempt ${i + 1}/${retries + 1} failed, retrying after ${delayMs}ms:`, err);
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }
  throw lastError;
}

// ── Tasks ────────────────────────────────────────────────────────────

export async function getTasksByUser(userId: string): Promise<TaskWithProgress[]> {
  try {
    const rows = await db
      .select({
        id: tasks.id,
        userId: tasks.userId,
        title: tasks.title,
        rawInput: tasks.rawInput,
        startDate: tasks.startDate,
        status: tasks.status,
        totalDays: tasks.totalDays,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        subtaskCount: sql<number>`COUNT(${subtasks.id})::int`,
        completedCount: sql<number>`COUNT(${subtasks.id}) FILTER (WHERE ${subtasks.completed} = true)::int`,
      })
      .from(tasks)
      .leftJoin(subtasks, eq(subtasks.taskId, tasks.id))
      .where(eq(tasks.userId, userId))
      .groupBy(tasks.id)
      .orderBy(desc(tasks.createdAt));

    if (rows) {
      for (const t of rows) {
        memStore.tasks.set(t.id, t);
      }
      return rows as TaskWithProgress[];
    }
  } catch (err) {
    console.error("[db] getTasksByUser DB query failed:", { userId, error: err });
  }

  const userTasks = Array.from(memStore.tasks.values())
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return userTasks.map((t) => {
    const taskSubtasks = Array.from(memStore.subtasks.values()).filter((s) => s.taskId === t.id);
    return {
      ...t,
      subtaskCount: taskSubtasks.length,
      completedCount: taskSubtasks.filter((s) => s.completed).length,
    };
  });
}

/** 返回该用户所有子任务，附带所属大任务 title / rawInput / startDate / status */
export async function getSubtasksWithTaskByUser(userId: string): Promise<SubtaskWithTask[]> {
  try {
    const rows = await db
      .select({
        id: subtasks.id,
        taskId: subtasks.taskId,
        title: subtasks.title,
        description: subtasks.description,
        durationDays: subtasks.durationDays,
        startDay: subtasks.startDay,
        completed: subtasks.completed,
        sortOrder: subtasks.sortOrder,
        resources: subtasks.resources,
        topic: subtasks.topic,
        urgency: subtasks.urgency,
        importance: subtasks.importance,
        keywords: subtasks.keywords,
        completedAt: subtasks.completedAt,
        bloomLevel: subtasks.bloomLevel,
        deepWorkHours: subtasks.deepWorkHours,
        createdAt: subtasks.createdAt,
        taskTitle: tasks.title,
        taskRawInput: tasks.rawInput,
        taskStartDate: tasks.startDate,
        taskStatus: tasks.status,
        taskCreatedAt: tasks.createdAt,
      })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt), subtasks.sortOrder);

    if (rows) return rows as SubtaskWithTask[];
  } catch (err) {
    console.error("[db] getSubtasksWithTaskByUser DB query failed:", { userId, error: err });
  }

  const userTasks = Array.from(memStore.tasks.values()).filter((t) => t.userId === userId);
  const taskMap = new Map(userTasks.map((t) => [t.id, t]));

  const result: SubtaskWithTask[] = [];
  for (const s of memStore.subtasks.values()) {
    const parent = taskMap.get(s.taskId);
    if (parent) {
      result.push({
        ...s,
        taskTitle: parent.title,
        taskRawInput: parent.rawInput,
        taskStartDate: parent.startDate,
        taskStatus: parent.status,
        taskCreatedAt: parent.createdAt,
      });
    }
  }

  result.sort((a, b) => {
    const timeDiff = new Date(b.taskCreatedAt).getTime() - new Date(a.taskCreatedAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.sortOrder - b.sortOrder;
  });

  return result;
}

export async function getTaskById(id: string): Promise<Task | null> {
  try {
    const rows = await db.select().from(tasks).where(eq(tasks.id, id));
    if (rows[0]) {
      memStore.tasks.set(rows[0].id, rows[0]);
      return rows[0];
    }
  } catch (err) {
    console.error("[db] getTaskById DB query failed:", { id, error: err });
  }
  return memStore.tasks.get(id) ?? null;
}

export async function createTask(
  userId: string,
  title: string
): Promise<Task> {
  await ensureSchema().catch((err) => {
    console.warn("[tasks] ensureSchema check returned error:", err);
  });

  const newTask: Task = {
    id: crypto.randomUUID(),
    userId,
    title,
    rawInput: null,
    startDate: null,
    status: "active",
    totalDays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    const rows = await withDbRetry(() =>
      db
        .insert(tasks)
        .values(newTask)
        .returning()
    );
    if (rows[0]) {
      memStore.tasks.set(rows[0].id, rows[0]);
      return rows[0];
    }
    throw new Error(`createTask returning empty rows for id=${newTask.id}`);
  } catch (err) {
    console.error("[tasks] createTask FATAL DB ERROR:", {
      userId,
      title,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

export async function updateTaskTitleAndRawInput(
  id: string,
  title: string,
  rawInput: string,
): Promise<void> {
  try {
    await withDbRetry(() =>
      db
        .update(tasks)
        .set({ title, rawInput, updatedAt: new Date() })
        .where(eq(tasks.id, id))
    );
    const existing = memStore.tasks.get(id);
    if (existing) {
      existing.title = title;
      existing.rawInput = rawInput;
      existing.updatedAt = new Date();
    }
  } catch (err) {
    console.error("[tasks] updateTaskTitleAndRawInput FATAL DB ERROR:", { id, error: err });
    throw err;
  }
}

export async function updateTaskStartDate(
  id: string,
  startDate: Date,
): Promise<void> {
  try {
    await withDbRetry(() =>
      db
        .update(tasks)
        .set({ startDate, updatedAt: new Date() })
        .where(eq(tasks.id, id))
    );
    const existing = memStore.tasks.get(id);
    if (existing) {
      existing.startDate = startDate;
      existing.updatedAt = new Date();
    }
  } catch (err) {
    console.error("[tasks] updateTaskStartDate FATAL DB ERROR:", { id, error: err });
    throw err;
  }
}

export async function updateTaskTotalDays(
  id: string,
  totalDays: number
): Promise<void> {
  try {
    await withDbRetry(() =>
      db
        .update(tasks)
        .set({ totalDays, updatedAt: new Date() })
        .where(eq(tasks.id, id))
    );
    const existing = memStore.tasks.get(id);
    if (existing) {
      existing.totalDays = totalDays;
      existing.updatedAt = new Date();
    }
  } catch (err) {
    console.error("[tasks] updateTaskTotalDays FATAL DB ERROR:", { id, totalDays, error: err });
    throw err;
  }
}

export async function updateTaskStatus(
  id: string,
  status: string
): Promise<void> {
  try {
    await withDbRetry(() =>
      db
        .update(tasks)
        .set({ status, updatedAt: new Date() })
        .where(eq(tasks.id, id))
    );
    const existing = memStore.tasks.get(id);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date();
    }
  } catch (err) {
    console.error("[tasks] updateTaskStatus FATAL DB ERROR:", { id, status, error: err });
    throw err;
  }
}

export async function deleteTask(id: string): Promise<void> {
  try {
    await withDbRetry(() => db.delete(tasks).where(eq(tasks.id, id)));
    memStore.tasks.delete(id);
    for (const [sId, s] of memStore.subtasks.entries()) {
      if (s.taskId === id) memStore.subtasks.delete(sId);
    }
  } catch (err) {
    console.error("[tasks] deleteTask FATAL DB ERROR:", { id, error: err });
    throw err;
  }
}

// ── Subtasks ─────────────────────────────────────────────────────────

/** 删除指定大任务下的全部子任务（重新生成或微调排期时清理旧数据） */
export async function deleteSubtasksByTaskId(taskId: string): Promise<void> {
  try {
    await withDbRetry(() => db.delete(subtasks).where(eq(subtasks.taskId, taskId)));
    for (const [sId, s] of memStore.subtasks.entries()) {
      if (s.taskId === taskId) memStore.subtasks.delete(sId);
    }
  } catch (err) {
    console.error("[tasks] deleteSubtasksByTaskId FATAL DB ERROR:", { taskId, error: err });
    throw err;
  }
}

export async function getSubtasksByTask(taskId: string): Promise<Subtask[]> {
  try {
    const rows = await db
      .select()
      .from(subtasks)
      .where(eq(subtasks.taskId, taskId))
      .orderBy(subtasks.sortOrder);
    if (rows && rows.length > 0) {
      for (const r of rows) {
        memStore.subtasks.set(r.id, r);
      }
      return rows;
    }
  } catch (err) {
    console.error("[db] getSubtasksByTask DB query failed:", { taskId, error: err });
  }

  return Array.from(memStore.subtasks.values())
    .filter((s) => s.taskId === taskId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export type SubtaskInsert = {
  title: string;
  description?: string;
  durationDays: number;
  startDay: number;
  sortOrder: number;
  resources?: string | null;
  topic?: string | null;
  urgency?: number | null;
  importance?: number | null;
  keywords?: string | null;  // JSON string[]
  bloomLevel?: number | null;     // 1-6 Bloom 认知层级
  deepWorkHours?: number | null;  // 预计深度学习时长（小时）
};

export async function createSubtasks(
  taskId: string,
  items: SubtaskInsert[]
): Promise<Subtask[]> {
  if (items.length === 0) return [];
  const createdList: Subtask[] = items.map((s) => ({
    id: crypto.randomUUID(),
    taskId,
    title: s.title,
    description: s.description ?? null,
    durationDays: s.durationDays,
    startDay: s.startDay,
    completed: false,
    sortOrder: s.sortOrder,
    resources: s.resources ?? null,
    topic: s.topic ?? null,
    urgency: s.urgency ?? null,
    importance: s.importance ?? null,
    keywords: s.keywords ?? null,
    completedAt: null,
    bloomLevel: s.bloomLevel ?? null,
    deepWorkHours: s.deepWorkHours ?? null,
    createdAt: new Date(),
  }));

  try {
    const rows = await withDbRetry(() =>
      db
        .insert(subtasks)
        .values(createdList)
        .returning()
    );
    if (rows && rows.length > 0) {
      for (const row of rows) {
        memStore.subtasks.set(row.id, row);
      }
      return rows;
    }
    throw new Error(`createSubtasks returned empty rows for taskId=${taskId}`);
  } catch (err) {
    console.error("[tasks] createSubtasks FATAL DB ERROR:", {
      taskId,
      itemCount: items.length,
      error: err instanceof Error ? err.message : err,
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

export async function toggleSubtask(
  id: string,
  completed: boolean,
  taskId: string
): Promise<void> {
  try {
    await withDbRetry(() =>
      db.update(subtasks)
        .set({
          completed,
          completedAt: completed ? new Date() : null,
        })
        .where(and(eq(subtasks.id, id), eq(subtasks.taskId, taskId)))
    );
    const existing = memStore.subtasks.get(id);
    if (existing && existing.taskId === taskId) {
      existing.completed = completed;
      existing.completedAt = completed ? new Date() : null;
    }
  } catch (err) {
    console.error("[tasks] toggleSubtask FATAL DB ERROR:", { id, taskId, error: err });
    throw err;
  }
}

/**
 * 将单个子任务往后延迟一天：startDay += 1。
 */
export async function postponeSubtask(id: string, taskId: string, delta = 1): Promise<number | null> {
  try {
    const rows = await db
      .select({ startDay: subtasks.startDay })
      .from(subtasks)
      .where(and(eq(subtasks.id, id), eq(subtasks.taskId, taskId)))
      .limit(1);
    if (rows.length > 0) {
      const current = rows[0].startDay ?? 0;
      const next = Math.max(0, current + delta);
      await withDbRetry(() =>
        db.update(subtasks)
          .set({ startDay: next })
          .where(and(eq(subtasks.id, id), eq(subtasks.taskId, taskId)))
      );
      const mem = memStore.subtasks.get(id);
      if (mem) mem.startDay = next;
      return next;
    }
    return null;
  } catch (err) {
    console.error("[tasks] postponeSubtask FATAL DB ERROR:", { id, taskId, error: err });
    throw err;
  }
}

/** 返回该用户所有任务的排期摘要（用于全局接续计算） */
export async function getScheduledTasksByUser(userId: string): Promise<Array<{
  taskId: string;
  startDate: Date | null;
  totalDays: number;
  createdAt: Date;
  status: string;
}>> {
  try {
    const rows = await db
      .select({
        taskId: tasks.id,
        startDate: tasks.startDate,
        totalDays: tasks.totalDays,
        createdAt: tasks.createdAt,
        status: tasks.status,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(tasks.createdAt);
    if (rows) return rows;
  } catch (err) {
    console.error("[db] getScheduledTasksByUser DB query failed:", { userId, error: err });
  }

  return Array.from(memStore.tasks.values())
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((t) => ({
      taskId: t.id,
      startDate: t.startDate,
      totalDays: t.totalDays,
      createdAt: t.createdAt,
      status: t.status,
    }));
}

/** 返回该用户所有完成分析的任务（含子任务），用于右侧面板持久化加载 */
export type TaskWithSubtasksFull = Task & { subtasks: Subtask[] };

export async function getTasksWithSubtasksByUser(userId: string): Promise<TaskWithSubtasksFull[]> {
  try {
    const taskRows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));

    if (taskRows.length === 0) return [];

    const { inArray } = await import("drizzle-orm");
    const taskIds = taskRows.map((t) => t.id);
    const subtaskRows = await db
      .select()
      .from(subtasks)
      .where(inArray(subtasks.taskId, taskIds))
      .orderBy(subtasks.sortOrder);

    const byTask = new Map<string, Subtask[]>();
    for (const s of subtaskRows) {
      if (!byTask.has(s.taskId)) byTask.set(s.taskId, []);
      byTask.get(s.taskId)!.push(s);
    }

    return taskRows.map((t) => ({ ...t, subtasks: byTask.get(t.id) ?? [] }));
  } catch (err) {
    console.error("[db] getTasksWithSubtasksByUser DB query failed:", { userId, error: err });
  }

  const userTasks = Array.from(memStore.tasks.values())
    .filter((t) => t.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return userTasks.map((t) => ({
    ...t,
    subtasks: Array.from(memStore.subtasks.values())
      .filter((s) => s.taskId === t.id)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
