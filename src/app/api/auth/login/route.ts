import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailLowerFromDatabase as getUserByEmailLower } from "@/lib/db/queries";
import { verifyPassword } from "@/lib/auth/password";
import { loginConfiguredAdmin } from "@/lib/auth/admin-login";
import { adminConfigFingerprint, configuredAdminEmail, isManagedAdminAccount } from "@/lib/auth/admin-config";
import { accountErrorResponse } from "@/lib/auth/account-error";
import { signSession } from "@/lib/auth/jwt";
import { checkRateLimit, getClientIp } from "@/lib/auth/ratelimit";
import { buildSetSessionCookie } from "@/lib/auth/cookie";

/**
 * POST /api/auth/login
 *
 * Body: `{ email: string, password: string }`
 *
 * 行为：
 *   - 受 60s/5 次/IP 限流。
 *   - 小写 email 查 users → bcrypt compare → 不匹配返回 401。
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
  let user;

  const adminEmail = configuredAdminEmail();
  if (adminEmail && emailLower === adminEmail) {
    try { user = await loginConfiguredAdmin(password); }
    catch (error) { return accountErrorResponse(error); }
  } else {
    user = await getUserByEmailLower(emailLower);
    if (user && isManagedAdminAccount(user)) {
      return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    }
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
    version: user.sessionVersion,
    adminConfig: emailLower === adminEmail ? adminConfigFingerprint(user.id) : undefined,
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
