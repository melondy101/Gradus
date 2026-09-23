import { NextRequest, NextResponse } from "next/server";
import { createTempAccount } from "@/lib/auth/temp-account";
import { signSession, verifySession } from "@/lib/auth/jwt";
import { readSessionCookieFromRequest, buildSetSessionCookie } from "@/lib/auth/cookie";
import { AUTH_COOKIE_NAME } from "@/lib/auth/env";
import { getUserById } from "@/lib/db/queries";

/**
 * 进程内缓存：userId → 账号是否还在库里。
 *
 * 放行前要多问一次 DB，缓存把它压到「同一账号每个 TTL 内最多一次往返」。
 * 两个 TTL 故意不对称：
 *   - 命中的正结果缓存 60s。账号若在此期间被删，最坏是这 60s 内仍由
 *     `requireAuth` 返回 401（原行为），不会写错数据。
 *   - 查不到的负结果只缓存 5s。自愈不能被缓存拖住：账号刚被 cron 删掉，
 *     访客的下一个请求就该拿到新账号。
 */
const USER_EXISTS_TTL_MS = 60_000;
const USER_MISSING_TTL_MS = 5_000;
const USER_CACHE_MAX = 5_000;
const userExistsCache = new Map<string, { ok: boolean; at: number }>();

async function userExists(userId: string): Promise<boolean> {
  const now = Date.now();
  const hit = userExistsCache.get(userId);
  if (hit && now - hit.at < (hit.ok ? USER_EXISTS_TTL_MS : USER_MISSING_TTL_MS)) {
    return hit.ok;
  }

  const ok = (await getUserById(userId)) != null;

  if (userExistsCache.size >= USER_CACHE_MAX) {
    // Map 保序，头部就是最早写入的条目。
    for (const key of [...userExistsCache.keys()].slice(0, 1_000)) {
      userExistsCache.delete(key);
    }
  }
  userExistsCache.set(userId, { ok, at: now });
  return ok;
}

/**
 * 把刚签发的 session 写回「即将转发给 handler 的请求」的 Cookie 头。
 *
 * 没有这一步，中间件只是在**响应**上 Set-Cookie，而 handler 里的
 * `requireAuth(request)` 读的是**进来的请求**——于是新访客的第一个
 * `/api/*` 请求必然 401，要等浏览器把 cookie 存下来、第二个请求才通，
 * 首屏因此闪一下空状态。转发时带上 cookie 即可让首个请求直接可用。
 */
function forwardWithSession(request: NextRequest, token: string): { headers: Headers } {
  const headers = new Headers(request.headers);
  headers.set("cookie", `${AUTH_COOKIE_NAME}=${token}`);
  return { headers };
}

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
 *   - 不校验密码 / 邮箱——这里只认 cookie 里的 JWT。
 *
 * 幽灵会话（cookie 合法但账号已被删）：唯一在**放行前**查库的地方。少了这一步，
 * 被 cron 清掉的临时账号手里的旧 cookie 仍能过中间件，而 handler 里的
 * `requireAuth` 查不到人只能 401——访客看到一片空面板且只能手动清 cookie 才能
 * 恢复。这里查出账号不存在就落到下面的重建分支，换个新账号 + 新 cookie 放行。
 */
export const config = {
  matcher: [
    // 受保护的 API：除了 auth/register|login、notifications/cron/* 与 calendar/subscribe 之外的所有 /api/*
    "/api/((?!auth/register|auth/login|notifications/cron|calendar/subscribe).*)",
    // 产品页本身也要走一遍：根布局在 RSC 阶段读 cookie 解 user，
    // 而访客的第一个请求是导航到 /app（还没有 cookie）。少了这条，
    // 首屏拿到的 user 是 null，今日面板渲染成空状态，要等刷新才有数据。
    "/app",
  ],
};

export const runtime = "nodejs";

export async function middleware(request: NextRequest) {
  const token = readSessionCookieFromRequest(request);
  const decoded = token ? await verifySession(token) : null;

  if (decoded && token && (await userExists(decoded.sub))) {
    // 合法 JWT 且账号仍在库里：放行，并刷新 cookie 过期时间（滑动续期）。
    const res = NextResponse.next();
    res.headers.append("set-cookie", buildSetSessionCookie(token));
    return res;
  }

  // 无 cookie / 无效 cookie / 账号已被删（幽灵会话）：
  // 建临时账号 → 签 JWT → Set-Cookie → 放行。
  try {
    const user = await createTempAccount();
    const newToken = await signSession({
      sub: user.id,
      name: user.name ?? "访客",
      email: user.email ?? "",
    });
    const res = NextResponse.next({ request: forwardWithSession(request, newToken) });
    res.headers.append("set-cookie", buildSetSessionCookie(newToken));
    return res;
  } catch (err) {
    // 真出错了（DB 不可达 / 未跑迁移）。把错误冒泡给 handler —— 让
    // requireAuth 给出 503，而不是默默创建一个假的 cookie。
    console.error("[middleware] failed to bootstrap temp account:", err);
    return NextResponse.next();
  }
}
