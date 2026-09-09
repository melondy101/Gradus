import { NextResponse } from "next/server";

/**
 * GET /api/auth/config
 * 返回当前认证系统的公共配置（是否启用观猹快捷登录、是否配置了 Resend 邮件服务等）
 */
export async function GET() {
  const watchaClientId = process.env.WATCHA_CLIENT_ID?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  return NextResponse.json({
    ok: true,
    // 当检测到配置了 WATCHA_CLIENT_ID 时，前端才渲染观猹快捷登录入口
    watchaEnabled: Boolean(watchaClientId),
    // 是否已配置 Resend 真实发信
    resendConfigured: Boolean(resendApiKey),
    // 是否启用邮箱验证码流程
    emailVerificationEnabled: true,
  });
}
