import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { signCalendarToken } from "@/lib/calendar/token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/calendar/token
 *
 * 获取当前登录用户的专属日历订阅 Token 与各类订阅 URL。
 * 需要用户登录态（通过 requireAuth）。
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const token = await signCalendarToken(auth.user.id);
  const origin = request.nextUrl.origin || "https://talk-task.vercel.app";

  // 生成 WebCal 与 HTTPS 订阅地址
  const feedUrl = `${origin}/api/calendar/subscribe?token=${encodeURIComponent(token)}`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, "webcal://");
  const directDownloadUrl = `${feedUrl}&download=1`;

  return NextResponse.json({
    ok: true,
    token,
    feedUrl,
    webcalUrl,
    directDownloadUrl,
  });
}
