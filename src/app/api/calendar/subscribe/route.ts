import { NextRequest, NextResponse } from "next/server";
import { verifyCalendarToken } from "@/lib/calendar/token";
import { getSubtasksWithTaskByUser } from "@/lib/db/queries/tasks";
import { generateIcalString } from "@/lib/calendar/ical-generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/calendar/subscribe
 *
 * 标准 iCalendar (RFC 5545) / WebCal 动态订阅端点。
 * 供 Apple 日历、Google Calendar、飞书日历、Outlook 定时轮询拉取。
 *
 * Query 参数：
 *   - `token`: 必填，用户专属日历订阅令牌（通过 /api/calendar/token 获取）
 *   - `taskId`: 可选，仅导出指定大任务的子任务排期
 *   - `startHour`: 可选，每日学习开始整点小时（默认 20）
 *   - `includeCompleted`: 可选，"1" / "0"，是否包含已完成任务（默认 1）
 *   - `includeReviews`: 可选，"1" / "0"，是否生成艾宾浩斯复习提醒（默认 1）
 *   - `reminder`: 可选，提前提醒分钟数（默认 15）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing calendar token. Please provide ?token=...", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const userId = await verifyCalendarToken(token);
  if (!userId) {
    return new NextResponse("Invalid or expired calendar token.", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 获取用户所有子任务及所属大任务信息
  let allSubtasks = await getSubtasksWithTaskByUser(userId);

  // 若指定了单个任务过滤
  const taskId = searchParams.get("taskId");
  if (taskId) {
    allSubtasks = allSubtasks.filter((s) => s.taskId === taskId);
  }

  // 解析偏好参数
  const startHour = searchParams.get("startHour")
    ? Math.max(0, Math.min(23, parseInt(searchParams.get("startHour")!, 10) || 20))
    : 20;
  const includeCompleted = searchParams.get("includeCompleted") !== "0";
  const includeReviews = searchParams.get("includeReviews") !== "0";
  const reminderMinutes = searchParams.get("reminder") !== null
    ? Math.max(0, parseInt(searchParams.get("reminder")!, 10) || 0)
    : 15;

  const origin = request.nextUrl.origin || "https://talk-task.vercel.app";

  const icsBody = generateIcalString(allSubtasks, {
    startHour,
    includeCompleted,
    includeReviews,
    reminderMinutes,
    calendarName: taskId && allSubtasks[0] ? `拾级 · ${allSubtasks[0].taskTitle}` : "拾级 · 学习规划",
    baseUrl: origin,
  });

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="gradus-calendar${taskId ? `-${taskId}` : ""}.ics"`,
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
