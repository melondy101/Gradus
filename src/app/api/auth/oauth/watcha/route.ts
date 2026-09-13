import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/oauth/watcha
 * 引导用户跳转到观猹（Watcha.cn）OAuth 2.0 授权页面
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.WATCHA_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "观猹 OAuth 尚未配置 WATCHA_CLIENT_ID 环境变量" },
      { status: 503 }
    );
  }

  const authBaseUrl =
    process.env.WATCHA_AUTH_URL?.trim() || "https://watcha.cn/oauth/authorize";

  // 构建回调地址（自动适配当前 Host 或配置域名）
  const origin =
    request.nextUrl.origin ||
    request.headers.get("x-forwarded-host") ||
    "https://watcha.cn";
  const redirectUri = `${origin}/api/auth/oauth/watcha/callback`;

  // 生成防伪 state
  const state = crypto.randomUUID();

  const authUrl = new URL(authBaseUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "user_info email");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl.toString());
  // 设置临时 state cookie 用于回调校验（5分钟有效）
  response.cookies.set("watcha_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
