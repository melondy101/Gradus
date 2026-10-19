import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { subtasks, tasks, watchaUsageAttempts } from "@/lib/db/schema";
import type { SubtaskInsert } from "@/lib/db/queries/tasks";
import { memStore } from "@/lib/db/memory-store";
import { consumeWatchaQuota, WatchaPayError, type WatchaPayConfig } from "./watcha-pay";

export interface WatchaPlanPayload {
  taskName: string;
  rawInput: string;
  startDate: string;
  topicCategory: string;
  priorLevel: string;
  bloomTarget: number;
  reviewNodes: ReturnType<typeof import("@/lib/scheduler").suggestReviewNodes>;
  verifiedCount: number;
  reachableCount: number;
  subtaskItems: SubtaskInsert[];
}

export async function pendingWatchaUsage(userId: string, taskId: string) {
  const [attempt] = await db.select().from(watchaUsageAttempts).where(and(
    eq(watchaUsageAttempts.userId, userId), eq(watchaUsageAttempts.taskId, taskId),
    inArray(watchaUsageAttempts.status, ["prepared", "consumed"]),
  )).limit(1);
  return attempt ?? null;
}

export async function prepareWatchaUsage(userId: string, taskId: string,
  entitlementId: string, payload: WatchaPlanPayload) {
  const [attempt] = await db.insert(watchaUsageAttempts).values({
    userId, taskId, entitlementId, payload: payload as unknown as Record<string, unknown>,
  }).onConflictDoNothing().returning();
  if (attempt) return attempt;
  const existing = await pendingWatchaUsage(userId, taskId);
  if (!existing) throw new Error("无法保存额度扣减记录");
  return existing;
}

/** The durable row ID is reused as Watcha's idempotency key on every retry. */
export async function deliverWatchaUsage(config: WatchaPayConfig,
  attempt: typeof watchaUsageAttempts.$inferSelect) {
  if (attempt.status === "prepared") {
    try {
      await consumeWatchaQuota(config, attempt.entitlementId, attempt.userId, attempt.id);
    } catch (error) {
      if (error instanceof WatchaPayError && error.status === 409 && error.code === "insufficient_quota") {
        // The platform explicitly confirms this attempt did not consume quota.
        await db.update(watchaUsageAttempts).set({ status: "failed", updatedAt: new Date() })
          .where(and(eq(watchaUsageAttempts.id, attempt.id), eq(watchaUsageAttempts.status, "prepared")));
      }
      throw error;
    }
    await db.update(watchaUsageAttempts).set({ status: "consumed", updatedAt: new Date() })
      .where(and(eq(watchaUsageAttempts.id, attempt.id), eq(watchaUsageAttempts.status, "prepared")));
  }

  const delivered = await db.transaction(async (tx) => {
    const [current] = await tx.select().from(watchaUsageAttempts)
      .where(eq(watchaUsageAttempts.id, attempt.id)).for("update");
    if (!current || current.userId !== attempt.userId ||
        (current.status !== "consumed" && current.status !== "delivered")) {
      throw new Error("额度扣减记录状态无法确认");
    }
    const payload = current.payload as unknown as WatchaPlanPayload;
    if (!payload || !Array.isArray(payload.subtaskItems) || payload.subtaskItems.length === 0 ||
        !Number.isFinite(new Date(payload.startDate).getTime())) {
      throw new Error("待交付计划格式无效");
    }
    if (current.status === "delivered") {
      const saved = await tx.select().from(subtasks).where(eq(subtasks.taskId, current.taskId));
      const totalDays = saved.reduce((max, item) => Math.max(max, item.startDay + item.durationDays), 0);
      return { saved, totalDays, payload };
    }
    const [task] = await tx.select({ id: tasks.id }).from(tasks)
      .where(and(eq(tasks.id, current.taskId), eq(tasks.userId, current.userId))).for("update");
    if (!task) throw new Error("待交付任务不存在");

    const rows = payload.subtaskItems.map((item) => ({
      taskId: current.taskId, title: item.title, description: item.description ?? null,
      durationDays: item.durationDays, startDay: item.startDay, sortOrder: item.sortOrder,
      resources: item.resources ?? null, topic: item.topic ?? null,
      urgency: item.urgency ?? null, importance: item.importance ?? null,
      keywords: item.keywords ?? null, bloomLevel: item.bloomLevel ?? null,
      deepWorkHours: item.deepWorkHours ?? null,
    }));
    await tx.delete(subtasks).where(eq(subtasks.taskId, current.taskId));
    const saved = await tx.insert(subtasks).values(rows).returning();
    const totalDays = saved.reduce((max, item) => Math.max(max, item.startDay + item.durationDays), 0);
    await tx.update(tasks).set({
      title: payload.taskName, rawInput: payload.rawInput,
      startDate: new Date(payload.startDate), totalDays, status: "done", updatedAt: new Date(),
    }).where(eq(tasks.id, current.taskId));
    await tx.update(watchaUsageAttempts).set({ status: "delivered", updatedAt: new Date() })
      .where(eq(watchaUsageAttempts.id, current.id));
    return { saved, totalDays, payload };
  });
  for (const [id, item] of memStore.subtasks) {
    if (item.taskId === attempt.taskId) memStore.subtasks.delete(id);
  }
  for (const item of delivered.saved) memStore.subtasks.set(item.id, item);
  const cachedTask = memStore.tasks.get(attempt.taskId);
  if (cachedTask) {
    cachedTask.title = delivered.payload.taskName;
    cachedTask.rawInput = delivered.payload.rawInput;
    cachedTask.startDate = new Date(delivered.payload.startDate);
    cachedTask.totalDays = delivered.totalDays;
    cachedTask.status = "done";
    cachedTask.updatedAt = new Date();
  }
  return delivered;
}
