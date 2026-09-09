import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailLower, upsertUser } from "@/lib/db/queries";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { signSession } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/auth/ratelimit";
import { buildSetSessionCookie } from "@/lib/auth/cookie";
import { ADMIN_EMAIL, ADMIN_DEFAULT_PASSWORD } from "@/lib/auth/admin";

/**
 * POST /api/auth/login
 *
 * Body: `{ email: string, password: string }`
 *
 * 行为：
 *   - 受 60s/5 次/IP 限流。
 *   - 小写 email 查 users → bcrypt compare → 不匹配返回 401。
 *   - 管理员账号 (dae201459@gmail.com) 首次或重设密码自愈初始化。
 *   - 签 JWT → Set-Cookie → 返回 user。
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  const rl = await checkRateLimit(ip, "login", { ua });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "操作过于频繁，请稍后再试" },
      { status: 429 },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "请求体格式错误" }, { status: 400 });
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!rawEmail || !password) {
    return NextResponse.json(
      { error: "邮箱和密码不能为空" },
      { status: 400 },
    );
  }

  const emailLower = rawEmail.toLowerCase();
  let user = await getUserByEmailLower(emailLower);

  // 管理员账号专属通道：如果使用预设管理员密码，自动初始化/更新管理员记录
  if (emailLower === ADMIN_EMAIL.toLowerCase() && password === ADMIN_DEFAULT_PASSWORD) {
    const adminHash = await hashPassword(ADMIN_DEFAULT_PASSWORD);
    user = await upsertUser({
      id: user?.id || `admin-${Date.now()}`,
      email: ADMIN_EMAIL,
      emailLower: ADMIN_EMAIL.toLowerCase(),
      name: user?.name || "系统管理员",
      passwordHash: adminHash,
      membershipTier: "premium",
      membershipExpiresAt: new Date("2099-12-31T23:59:59Z"),
    });
  }

  // 始终执行一次 hash verify，让相同输入的耗时一致 —— 避免攻击者通过响应
  // 时间差异判断"邮箱是否存在"。
  let passwordOk = false;
  if (user && user.passwordHash) {
    passwordOk = await verifyPassword(password, user.passwordHash);
  } else if (!user) {
    // 不存在的邮箱 —— 仍跑一次假 verify 维持时间平衡
    await verifyPassword(password, "$2a$10$invalidsaltinvalidsaltinvalidsaltinvalidsalt");
  }

  if (!user || !passwordOk) {
    return NextResponse.json(
      { error: "邮箱或密码不正确" },
      { status: 401 },
    );
  }

  const token = await signSession({
    sub: user.id,
    name: user.name ?? "",
    email: user.email ?? emailLower,
  });

  const res = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
  res.headers.append("set-cookie", buildSetSessionCookie(token));
  return res;
}

export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}