import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, users } from "@/lib/db/schema";
import { getUserByEmailLower, getUserById } from "@/lib/db/queries";
import { hashPassword } from "@/lib/auth/password";
import { signSession, verifySession } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/auth/ratelimit";
import {
  buildSetSessionCookie,
  readSessionCookieFromRequest,
} from "@/lib/auth/cookie";

/**
 * POST /api/auth/register
 *
 * Body: `{ name: string, email: string, password: string }`
 *
 * 行为：
 *   - 受 60s/5 次/IP 限流。
 *   - email trim + 小写归一写入 `email` 与 `emailLower`，任一列 UNIQUE
 *     冲突返回 409。
 *   - bcrypt hash → 插 users 行 → 同事务执行"临时账号合并"：
 *       UPDATE tasks SET user_id = new WHERE user_id = temp
 *       DELETE FROM users WHERE id = temp
 *   - 签 JWT → Set-Cookie → 返回 user。
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  // 限流必须在最前面 —— 否则恶意脚本会绕过整个流程
  const rl = await checkRateLimit(ip, "register", { ua });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  // 1) 解析 body
  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!name) {
    return NextResponse.json({ error: "姓名不能为空" }, { status: 400 });
  }
  if (!rawEmail) {
    return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 个字符" }, { status: 400 });
  }
  if (password.length > 200) {
    return NextResponse.json({ error: "密码过长" }, { status: 400 });
  }

  const emailLower = rawEmail.toLowerCase();

  // 2) 查重（emailLower 唯一性）
  const existing = await getUserByEmailLower(emailLower);
  if (existing) {
    return NextResponse.json(
      { error: "该邮箱已被注册" },
      { status: 409 },
    );
  }

  // 3) 检测 cookie：是否有临时账号？若有，merge。
  const cookieToken = readSessionCookieFromRequest(request);
  const decoded = cookieToken ? await verifySession(cookieToken) : null;
  let tempUserId: string | null = null;
  if (decoded) {
    const cookieUser = await getUserById(decoded.sub);
    if (
      cookieUser &&
      cookieUser.passwordHash === "" &&
      cookieUser.email?.endsWith("@anon.local")
    ) {
      tempUserId = cookieUser.id;
    }
  }

  const newUserId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    // 4) 在一个事务里做：插新用户 → 迁移 tasks → 删临时用户
    await db.transaction(async (tx) => {
      // 插新用户
      await tx.insert(users).values({
        id: newUserId,
        email: rawEmail,
        emailLower,
        name,
        passwordHash,
        avatarUrl: null,
      });

      // 迁移临时账号的任务（如有）
      if (tempUserId) {
        await tx
          .update(tasks)
          .set({ userId: newUserId, updatedAt: new Date() })
          .where(eq(tasks.userId, tempUserId));
        // 删临时账号（FK CASCADE 仍会兜底；但显式删更清晰）
        await tx.delete(users).where(eq(users.id, tempUserId));
      }
    });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    // 23505 = unique_violation。理论上 2) 已经查重，但并发场景仍可能撞。
    if (e?.code === "23505") {
      return NextResponse.json(
        { error: "该邮箱已被注册" },
        { status: 409 },
      );
    }
    console.error("[auth] register transaction failed:", err);
    const message =
      (err instanceof Error ? err.message : String(err)) || "注册失败，请稍后再试";
    return NextResponse.json(
      { error: "注册失败，请稍后再试", detail: message },
      { status: 500 },
    );
  }

  // 5) 签 JWT + Set-Cookie
  const token = await signSession({
    sub: newUserId,
    name,
    email: rawEmail,
  });

  const res = NextResponse.json({
    ok: true,
    user: { id: newUserId, name, email: rawEmail },
    merged: tempUserId !== null,
  });
  res.headers.append("set-cookie", buildSetSessionCookie(token));
  return res;
}

// 给可能的 GET 探测返回 405（中间件 matcher 已排除此路径，但兜底）
export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
