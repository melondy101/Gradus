import { NextRequest, NextResponse } from "next/server";
import { createTempAccount } from "@/lib/auth/temp-account";
import { signSession, verifySession } from "@/lib/auth/jwt";
import { readSessionCookieFromRequest, buildSetSessionCookie } from "@/lib/auth/cookie";

/**
 * Edge / Server Middleware —— 鉴权兜底。
 *
 * 职责：
 *   1. 对**所有受保护**的 `/api/*` 请求（公开路由与 cron 排除在外）：
 *      - 没有 `__Host-session` cookie → 自动建临时账号，签 JWT，写 Set-Cookie。
 *      - 有 cookie 但 JWT 校验失败（过期 / 篡改 / 用户不存在）→ 同样走"建临时账号"分支。
 *      - 有 cookie 且合法 → 验证通过，**重置** Set-Cookie Max-Age（滑动续期）。
 *   2. cron / 公开路由 matcher 排除：
 *      - `auth/register` 与 `auth/login` —— 客户端在登录前也要 POST。
 *      - `notifications/cron/*` —— Vercel Cron 用 `Authorization: Bearer ${CRON_SECRET}`
 *        鉴权，不应被临时账号接管，也不消耗限流配额。
 *
 * 关键不变量：
 *   - 在受保护路由 handler 内 `await requireAuth(request)` **永远**拿到一个 userId。
 *   - 滑动续期通过每次重写 Set-Cookie 实现——客户端拿到新 cookie 自动替换。
 *
 * 不做的事：
 *   - 任何业务逻辑（建任务 / 改状态 / 调 AI）都还在 handler 里。
 *   - 不验证用户是否"真的存在" —— DB 中查 users 表留给 requireAuth。
 *     这里只看 JWT 签名是否合法（过期、篡改都会被 `verifySession` 拒绝）。
 */
export const config = {
  matcher: [
    // 受保护的 API：除了 auth/register|login、notifications/cron/* 与 calendar/subscribe 之外的所有 /api/*
    "/api/((?!auth/register|auth/login|notifications/cron|calendar/subscribe).*)",
  ],
};

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const token = readSessionCookieFromRequest(request);
  const decoded = token ? await verifySession(token) : null;

  if (decoded && token) {
    // 合法 JWT：放行，并刷新 cookie 过期时间（滑动续期）。
    const res = NextResponse.next();
    res.headers.append("set-cookie", buildSetSessionCookie(token));
    return res;
  }

  // 无 cookie / 无效 cookie：建临时账号 → 签 JWT → Set-Cookie → 放行。
  try {
    const user = await createTempAccount();
    const newToken = await signSession({
      sub: user.id,
      name: user.name ?? "访客",
      email: user.email ?? "",
    });
    const res = NextResponse.next();
    res.headers.append("set-cookie", buildSetSessionCookie(newToken));
    return res;
  } catch (err) {
    // 真出错了（DB 不可达 / 未跑迁移）。把错误冒泡给 handler —— 让
    // requireAuth 给出 503，而不是默默创建一个假的 cookie。
    console.error("[middleware] failed to bootstrap temp account:", err);
    return NextResponse.next();
  }
}
