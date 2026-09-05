// Self-hosted replacement for `@eazo/sdk/server`'s `requireAuth`.
//
// Off-platform we run a JWT cookie auth flow with two layers of defence:
//   1. `src/middleware.ts` (Edge / server runtime) intercepts every
//      `/api/*` request that lacks a valid `__Host-session` cookie and
//      creates a temp account before forwarding the request, so handlers
//      can always assume `requireAuth()` returns a real user.
//   2. `requireAuth(request)` here still re-validates the cookie for the
//      edge cases where middleware is bypassed (cron, etc.) or where a
//      cookie was tampered with. It only relies on the JWT path; no more
//      demo-user fallback.

import { readSessionCookieFromRequest } from "./cookie";
import { verifySession } from "./jwt";
import { getUserById } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";

export type { User };

export type AuthResult =
  | { ok: true; user: User; userId: string }
  | { ok: false; response: Response };

export async function requireAuth(request: Request): Promise<AuthResult> {
  try {
    const token = readSessionCookieFromRequest(request);
    if (!token) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: "未登录" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      };
    }

    const decoded = await verifySession(token);
    if (!decoded) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: "会话无效或已过期，请重新登录" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      };
    }

    const user = await getUserById(decoded.sub);
    if (!user) {
      // JWT 合法但 userId 在 DB 中不存在（账号被删）—— 拒绝
      return {
        ok: false,
        response: new Response(
          JSON.stringify({ error: "账号不存在" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      };
    }

    return { ok: true, user, userId: user.id };
  } catch (err) {
    // 真正的 503 场景：DB 不可达 / 未跑迁移 / env 未配
    console.error(
      "[auth] requireAuth failed — check DATABASE_URL, AUTH_SECRET, and that `bun run db:migrate` has been run:",
      err,
    );
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: "Service temporarily unavailable",
          hint: "Check server logs.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    };
  }
}