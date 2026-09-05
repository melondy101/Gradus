import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/current-user";

/**
 * GET /api/auth/me
 *
 * 返回当前已登录的用户信息。**匿名访客也会被 middleware 临时建账号**，
 * 所以这里总是返回一个用户——除非 cookie 被人手动清掉（在客户端发生时
 * middleware 会再发一个新的）。
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user });
}