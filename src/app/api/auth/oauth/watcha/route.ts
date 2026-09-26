import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/oauth/watcha
 * 引导用户跳转到观猹（Watcha.cn）OAuth 2.0 授权页面
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.WATCHA_CLIENT_ID?.trim();
  const clientSecret = process.env.WATCHA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "观猹 OAuth 尚未配置服务端凭据" },
      { status: 503 }
    );
  }

  const authBaseUrl =
    process.env.WATCHA_AUTH_URL?.trim() || "https://watcha.cn/oauth/authorize";

  // 生产环境配置 WATCHA_REDIRECT_URI，确保 Vercel 预览域名不会成为 OAuth 回调地址。
  const origin =
    request.nextUrl.origin ||
    request.headers.get("x-forwarded-host") ||
    "https://watcha.cn";
  const redirectUri =
    process.env.WATCHA_REDIRECT_URI?.trim() ||
    `${origin}/api/auth/oauth/watcha/callback`;

  // 生成防伪 state
  const state = crypto.randomUUID();
  const isBinding = request.nextUrl.searchParams.get("intent") === "bind";

  const authUrl = new URL(authBaseUrl);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "read email");
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
  if (isBinding) {
    response.cookies.set("watcha_oauth_intent", "bind", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    response.cookies.delete("watcha_oauth_intent");
  }

  return response;
}
