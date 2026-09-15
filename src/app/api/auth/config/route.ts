import { NextResponse } from "next/server";
import { isRealEmailConfigured, getEmailProviderType } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/config
 * 返回当前认证系统的公共配置（是否启用观猹快捷登录、是否配置了 QQ 邮箱/SMTP 发信服务等）
 */
export async function GET() {
  const watchaClientId = process.env.WATCHA_CLIENT_ID?.trim();
  const watchaClientSecret = process.env.WATCHA_CLIENT_SECRET?.trim();
  const emailConfigured = isRealEmailConfigured();
  const emailProvider = getEmailProviderType();

  return NextResponse.json({
    ok: true,
    // 只有服务端具备完整机密客户端凭据时，前端才渲染观猹快捷登录入口。
    watchaEnabled: Boolean(watchaClientId && watchaClientSecret),
    // 是否已配置真实邮件投递服务（QQ 邮箱 SMTP）
    emailConfigured,
    resendConfigured: emailConfigured, // 兼容过渡字段
    emailProvider,
    // 是否启用邮箱验证码流程
    emailVerificationEnabled: true,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

