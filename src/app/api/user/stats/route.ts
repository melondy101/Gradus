import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { subtasks, tasks } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * GET /api/user/stats
 * 返回用户学习统计：连续天数、今日完成数、本周完成数、历史累计、活跃任务数
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    // 获取所有完成记录（含完成时间）
    const rows = await db
      .select({
        completedAt: subtasks.completedAt,
        completed: subtasks.completed,
      })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(and(eq(tasks.userId, user.id), eq(subtasks.completed, true)));

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // 提取所有完成日期（去重）
    const completedDates = new Set<string>();
    let todayCount = 0;

    for (const row of rows) {
      if (row.completedAt) {
        const d = row.completedAt.toISOString().slice(0, 10);
        completedDates.add(d);
        if (d === todayStr) todayCount++;
      }
    }

    // 计算连续天数（从今天或昨天开始向前数）
    let streak = 0;
    const check = new Date(now);
    // 如果今天有完成记录从今天算，否则从昨天算
    if (!completedDates.has(todayStr)) {
      check.setDate(check.getDate() - 1);
    }
    while (true) {
      const d = check.toISOString().slice(0, 10);
      if (!completedDates.has(d)) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }

    // 本周完成数（周一到今天）
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=周一
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekRows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(subtasks)
      .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
      .where(and(
        eq(tasks.userId, user.id),
        eq(subtasks.completed, true),
        gte(subtasks.completedAt, weekStart),
      ));
    const weekCount = weekRows[0]?.count ?? 0;

    // 活跃任务数
    const activeTaskRows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.status, "active")));
    const activeTaskCount = activeTaskRows[0]?.count ?? 0;

    // 目标总数（用户创建过的全部任务，含已完成）
    const totalGoalRows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(eq(tasks.userId, user.id));
    const totalGoals = totalGoalRows[0]?.count ?? 0;

    return NextResponse.json({
      streak,
      todayCount,
      weekCount,
      totalCompleted: rows.length,
      activeTaskCount,
      // 累计学习天数：有完成记录的去重日期数
      learnDays: completedDates.size,
      // 目标总数（累计接触过的学习目标）
      totalGoals,
    });
  } catch (err) {
    console.error("[stats]", err);
    return NextResponse.json({ streak: 0, todayCount: 0, weekCount: 0, totalCompleted: 0, activeTaskCount: 0, learnDays: 0, totalGoals: 0 });
  }
}
