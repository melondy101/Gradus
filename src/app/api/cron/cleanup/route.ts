import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users, authAttempts, emailVerifications, tasks } from "@/lib/db/schema";
import { lt, and, eq, sql } from "drizzle-orm";
import { memStore } from "@/lib/db/memory-store";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    authAttemptsCleaned: 0,
    emailVerificationsCleaned: 0,
    tempAccountsCleaned: 0,
  };

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  try {
    // 1. 清理 24 小时前的限流尝试记录
    try {
      await db.delete(authAttempts).where(lt(authAttempts.attemptedAt, dayAgo));
    } catch {
      memStore.authAttempts = memStore.authAttempts.filter(
        (a) => new Date(a.attemptedAt).getTime() > dayAgo.getTime()
      );
    }

    // 2. 清理过期的邮箱验证码
    try {
      await db.delete(emailVerifications).where(lt(emailVerifications.expiresAt, now));
    } catch {
      for (const [id, ev] of memStore.emailVerifications.entries()) {
        if (new Date(ev.expiresAt).getTime() < now.getTime()) {
          memStore.emailVerifications.delete(id);
          results.emailVerificationsCleaned++;
        }
      }
    }

    // 3. 清理 14 天前的无任务临时访客账号
    try {
      // 查找 passwordHash 为空且 14 天前创建的临时用户
      const staleUsers = await db
        .select({ id: users.id })
        .from(users)
        .leftJoin(tasks, eq(tasks.userId, users.id))
        .where(
          and(
            eq(users.passwordHash, ""),
            lt(users.createdAt, twoWeeksAgo)
          )
        )
        .groupBy(users.id)
        .having(sql`COUNT(${tasks.id}) = 0`);

      if (staleUsers && staleUsers.length > 0) {
        for (const u of staleUsers) {
          await db.delete(users).where(eq(users.id, u.id));
          results.tempAccountsCleaned++;
        }
      }
    } catch {
      for (const [id, u] of memStore.users.entries()) {
        if (
          u.passwordHash === "" &&
          new Date(u.createdAt).getTime() < twoWeeksAgo.getTime()
        ) {
          const userHasTasks = Array.from(memStore.tasks.values()).some((t) => t.userId === id);
          if (!userHasTasks) {
            memStore.users.delete(id);
            results.tempAccountsCleaned++;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Cleanup failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
