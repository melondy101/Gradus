import { NextRequest, NextResponse } from "next/server";
import { getUserByEmailLower } from "@/lib/db/queries";
import { checkRateLimit, getClientIp } from "@/lib/auth/ratelimit";
import { createAndSendVerificationCode } from "@/lib/email/verification";

/**
 * POST /api/auth/send-code
 * Body: `{ email: string, type?: "register" | "login" }`
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  // 1. IP 级别限流（防批量恶意轰炸）
  const rl = await checkRateLimit(ip, "register", { ua });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "发送请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  let body: { email?: unknown; type?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const type = typeof body.type === "string" ? body.type : "register";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "请输入有效的电子邮箱地址" }, { status: 400 });
  }

  // 2. 注册场景下查重提前拦截
  if (type === "register") {
    const existing = await getUserByEmailLower(email.toLowerCase());
    if (existing) {
      return NextResponse.json({ error: "该邮箱已被注册，请直接登录" }, { status: 409 });
    }
  }

  // 3. 生成并发送验证码
  const result = await createAndSendVerificationCode(email);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "发送验证码失败", waitSeconds: result.waitSeconds },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "验证码已发送至您的邮箱，10 分钟内有效",
    devCode: result.devCode, // 仅在未配置 API Key 的本地开发模式下返回
  });
}
