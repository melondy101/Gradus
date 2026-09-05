import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tasks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Daily task reminder, triggered by `vercel.json#crons` and authenticated via
 * `CRON_SECRET`.
 *
 * Self-hosted mode: the original implementation fanned out a push through the
 * Eazo platform's `notifications` service, which is unavailable off-platform.
 * The cron still fires on schedule and computes the digest message; wire your
 * own delivery channel (email / web-push) here if you want real pushes.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 统计进行中的任务数量
  let activeCount = 0;
  try {
    const rows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(eq(tasks.status, "active"));
    activeCount = rows[0]?.count ?? 0;
  } catch {
    // 查询失败不影响返回
  }

  return NextResponse.json({
    ok: true,
    activeCount,
    pushed: false,
    note: "notifications disabled in self-hosted mode",
  });
}
