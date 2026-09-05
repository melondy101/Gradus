import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { tasks, subtasks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: "gradus-mcp",
    version: "1.0.0",
  });

  // ── tool: get_tasks ─────────────────────────────────────────────────
  server.tool(
    "get_tasks",
    "获取用户所有学习任务及完成进度",
    {
      status: z.enum(["active", "done", "all"]).optional().describe("筛选任务状态，默认返回全部"),
    },
    async ({ status }) => {
      const rows = await db
        .select({ id: tasks.id, title: tasks.title, status: tasks.status, totalDays: tasks.totalDays, createdAt: tasks.createdAt, startDate: tasks.startDate })
        .from(tasks)
        .where(status && status !== "all" ? and(eq(tasks.userId, userId), eq(tasks.status, status)) : eq(tasks.userId, userId))
        .orderBy(desc(tasks.createdAt));

      const taskIds = rows.map((r) => r.id);
      const progressMap = new Map<string, { total: number; completed: number }>();

      if (taskIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const subs = await db.select({ taskId: subtasks.taskId, completed: subtasks.completed }).from(subtasks).where(inArray(subtasks.taskId, taskIds));
        for (const s of subs) {
          const p = progressMap.get(s.taskId) ?? { total: 0, completed: 0 };
          p.total++; if (s.completed) p.completed++;
          progressMap.set(s.taskId, p);
        }
      }

      const result = rows.map((t) => {
        const p = progressMap.get(t.id) ?? { total: 0, completed: 0 };
        return { id: t.id, title: t.title, status: t.status, totalDays: t.totalDays, progress: p.total > 0 ? `${p.completed}/${p.total}` : "无子任务", progressPct: p.total > 0 ? Math.round(p.completed / p.total * 100) : 0, createdAt: t.createdAt?.toISOString().slice(0, 10), startDate: t.startDate?.toISOString().slice(0, 10) ?? null };
      });

      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ── tool: get_subtasks ──────────────────────────────────────────────
  server.tool(
    "get_subtasks",
    "获取指定大任务下所有子步骤（标题、描述、Bloom层级、完成状态、排期）",
    { task_id: z.string().describe("大任务 ID") },
    async ({ task_id }) => {
      const task = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and(eq(tasks.id, task_id), eq(tasks.userId, userId))).then((r) => r[0] ?? null);
      if (!task) return { content: [{ type: "text" as const, text: "任务不存在或无权访问" }], isError: true };

      const subs = await db.select().from(subtasks).where(eq(subtasks.taskId, task_id)).orderBy(subtasks.sortOrder);
      const result = subs.map((s) => ({ id: s.id, title: s.title, description: s.description, completed: s.completed, bloomLevel: s.bloomLevel, deepWorkHours: s.deepWorkHours, durationDays: s.durationDays, startDay: s.startDay, topic: s.topic, completedAt: s.completedAt?.toISOString().slice(0, 10) ?? null }));

      return { content: [{ type: "text" as const, text: JSON.stringify({ taskTitle: task.title, subtasks: result }, null, 2) }] };
    }
  );

  // ── tool: complete_subtask ──────────────────────────────────────────
  server.tool(
    "complete_subtask",
    "将指定子任务标记为已完成或取消完成",
    { subtask_id: z.string().describe("子任务 ID"), completed: z.boolean().describe("true=完成，false=取消") },
    async ({ subtask_id, completed }) => {
      const owned = await db.select({ id: subtasks.id }).from(subtasks).innerJoin(tasks, eq(subtasks.taskId, tasks.id)).where(and(eq(subtasks.id, subtask_id), eq(tasks.userId, userId))).then((r) => r[0] ?? null);
      if (!owned) return { content: [{ type: "text" as const, text: "子任务不存在或无权操作" }], isError: true };

      await db.update(subtasks).set({ completed, completedAt: completed ? new Date() : null }).where(eq(subtasks.id, subtask_id));
      return { content: [{ type: "text" as const, text: JSON.stringify({ ok: true, subtask_id, completed }) }] };
    }
  );

  // ── tool: get_today_tasks ───────────────────────────────────────────
  server.tool(
    "get_today_tasks",
    "获取今天排期内需要完成的学习任务列表",
    {},
    async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const rows = await db.select({ id: subtasks.id, title: subtasks.title, completed: subtasks.completed, deepWorkHours: subtasks.deepWorkHours, durationDays: subtasks.durationDays, startDay: subtasks.startDay, taskTitle: tasks.title, taskStartDate: tasks.startDate, bloomLevel: subtasks.bloomLevel }).from(subtasks).innerJoin(tasks, eq(subtasks.taskId, tasks.id)).where(and(eq(tasks.userId, userId), eq(tasks.status, "active")));

      const todayRows = rows.filter((r) => {
        if (!r.taskStartDate) return false;
        const base = new Date(r.taskStartDate);
        const start = new Date(base); start.setDate(base.getDate() + r.startDay);
        const end = new Date(base); end.setDate(base.getDate() + r.startDay + r.durationDays - 1);
        return start <= todayStart && todayStart <= end;
      });

      return { content: [{ type: "text" as const, text: JSON.stringify({ date: todayStart.toISOString().slice(0, 10), total: todayRows.length, pending: todayRows.filter((r) => !r.completed).length, tasks: todayRows.map((r) => ({ id: r.id, title: r.title, taskTitle: r.taskTitle, completed: r.completed, bloomLevel: r.bloomLevel, estimatedHours: r.deepWorkHours ?? r.durationDays * 1.5 })) }, null, 2) }] };
    }
  );

  return server;
}
