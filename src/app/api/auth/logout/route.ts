import { NextResponse } from "next/server";
import { buildClearSessionCookie } from "@/lib/auth/cookie";

/**
 * POST /api/auth/logout
 *
 * 仅清 cookie + 客户端 state；不维护撤销表（演示版可接受"复制 cookie
 * 在 30 天内仍可用"，已写入 AGENTS.md §15 TODO）。
 *
 * 注意 —— 这个路由不被 middleware matcher 排除（matcher 排除的是
 * `auth/register|auth/login`，logout 在里面）。这意味着用户登出后
 * 下一次受保护请求会被 middleware 视为"无 cookie" → 新建临时账号。
 * 这是预期行为：登出 = 回到匿名访客。
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("set-cookie", buildClearSessionCookie());
  return res;
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}