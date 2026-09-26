import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, users } from "@/lib/db/schema";
import { getUserById } from "@/lib/db/queries";
import { signSession, verifySession } from "@/lib/auth/jwt";
import {
  buildSetSessionCookie,
  readSessionCookieFromRequest,
} from "@/lib/auth/cookie";

class WatchaBindingConflictError extends Error {}

/**
 * GET /api/auth/oauth/watcha/callback
 * 处理观猹（Watcha.cn）OAuth 2.0 回调
 */
export async function GET(request: NextRequest) {
  const requestOrigin =
    request.nextUrl.origin ||
    request.headers.get("x-forwarded-host") ||
    "https://watcha.cn";
  const redirectUri =
    process.env.WATCHA_REDIRECT_URI?.trim() ||
    `${requestOrigin}/api/auth/oauth/watcha/callback`;
  const origin = new URL(redirectUri).origin;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[Watcha OAuth] Error from provider:", error, errorDescription);
    return oauthError(origin, errorDescription || error);
  }

  if (!code) {
    return oauthError(origin, "missing_authorization_code");
  }

  // 校验 state 防 CSRF
  const savedState = request.cookies.get("watcha_oauth_state")?.value;
  if (!savedState || !state || savedState !== state) {
    return oauthError(origin, "state_mismatch");
  }

  const clientId = process.env.WATCHA_CLIENT_ID?.trim();
  const clientSecret = process.env.WATCHA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return oauthError(origin, "watcha_oauth_not_configured");
  }

  const tokenUrl =
    process.env.WATCHA_TOKEN_URL?.trim() || "https://watcha.cn/oauth/api/token";
  const userinfoUrl =
    process.env.WATCHA_USERINFO_URL?.trim() || "https://watcha.cn/oauth/api/userinfo";

  try {
    // 1. 用 code 换取 access_token
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string;
      token_type?: string;
      openid?: string;
      error?: string;
      message?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Watcha OAuth] Token exchange failed:", tokenData);
      return oauthError(
        origin,
        tokenData.message || tokenData.error || "token_exchange_failed"
      );
    }

    const accessToken = tokenData.access_token;
    const openId = tokenData.openid;

    // 2. 获取观猹用户信息
    const userRes = await fetch(userinfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const userInfoResponse = (await userRes.json().catch(() => ({}))) as {
      data?: {
        user_id?: string | number;
        nickname?: string;
        email?: string;
        avatar_url?: string;
      };
    };
    if (!userRes.ok) {
      console.error("[Watcha OAuth] User info request failed:", userInfoResponse);
      return oauthError(origin, "watcha_userinfo_failed");
    }
    const userInfo = userInfoResponse.data;

    const watchaUid = userInfo?.user_id || openId;
    if (!watchaUid) {
      return oauthError(origin, "unable_to_get_watcha_user_id");
    }

    const watchaName =
      userInfo?.nickname || `观猹用户_${String(watchaUid).slice(0, 6)}`;
    const watchaEmail = userInfo?.email?.trim() || "";
    const watchaAvatar = userInfo?.avatar_url || null;

    // 3. 检查当前是否有临时访客账号，准备合并任务。
    const cookieToken = readSessionCookieFromRequest(request);
    const decoded = cookieToken ? await verifySession(cookieToken) : null;
    let tempUserId: string | null = null;
    let bindingUser: Awaited<ReturnType<typeof getUserById>> | null = null;
    if (decoded) {
      const cookieUser = await getUserById(decoded.sub);
      if (
        cookieUser &&
        cookieUser.passwordHash === "" &&
        cookieUser.email?.endsWith("@anon.local")
      ) {
        tempUserId = cookieUser.id;
      }
      if (request.cookies.get("watcha_oauth_intent")?.value === "bind" && cookieUser && !tempUserId) {
        bindingUser = cookieUser;
      }
    }

    // 4. 以观猹稳定 ID 为首选、邮箱为既有账户兼容规则，原子完成绑定与迁移。
    //    只有这一步成功后才会签发本站会话，避免 "观猹已授权但本站未登录"。
    const finalUser = await db.transaction(async (tx) => {
      const byOpenId = await tx
        .select()
        .from(users)
        .where(eq(users.watchaOpenId, String(watchaUid)))
        .limit(1);
      let existingUser = byOpenId[0];

      if (bindingUser) {
        if (existingUser && existingUser.id !== bindingUser.id) {
          throw new WatchaBindingConflictError();
        }
        if (!existingUser) {
          await tx.update(users)
            .set({ watchaOpenId: String(watchaUid), updatedAt: new Date() })
            .where(eq(users.id, bindingUser.id));
        }
        return {
          id: bindingUser.id,
          email: bindingUser.email || watchaEmail,
          name: bindingUser.name || watchaName,
        };
      }

      if (!existingUser && watchaEmail) {
        const byEmail = await tx
          .select()
          .from(users)
          .where(eq(users.emailLower, watchaEmail.toLowerCase()))
          .limit(1);
        existingUser = byEmail[0];
        if (existingUser) {
          await tx
            .update(users)
            .set({ watchaOpenId: String(watchaUid), updatedAt: new Date() })
            .where(eq(users.id, existingUser.id));
        }
      }

      if (existingUser) {
        if (tempUserId && tempUserId !== existingUser.id) {
          await tx
            .update(tasks)
            .set({ userId: existingUser.id, updatedAt: new Date() })
            .where(eq(tasks.userId, tempUserId));
          await tx.delete(users).where(eq(users.id, tempUserId));
        }
        return {
          id: existingUser.id,
          email: existingUser.email || watchaEmail,
          name: existingUser.name || watchaName,
        };
      }

      const id = crypto.randomUUID();
      const email =
        watchaEmail || `watcha_${crypto.randomUUID()}@watcha.user`;
      await tx.insert(users).values({
        id,
        email,
        emailLower: email.toLowerCase(),
        name: watchaName,
        passwordHash: "",
        avatarUrl: watchaAvatar,
        watchaOpenId: String(watchaUid),
      });

      if (tempUserId) {
        await tx
          .update(tasks)
          .set({ userId: id, updatedAt: new Date() })
          .where(eq(tasks.userId, tempUserId));
        await tx.delete(users).where(eq(users.id, tempUserId));
      }

      return { id, email, name: watchaName };
    });

    // 5. 签发与普通登录相同的本站 JWT 会话 Cookie。
    const sessionToken = await signSession({
      sub: finalUser.id,
      name: finalUser.name,
      email: finalUser.email,
    });

    const response = NextResponse.redirect(new URL("/?auth_success=1", origin));
    response.headers.append("set-cookie", buildSetSessionCookie(sessionToken));
    response.cookies.delete("watcha_oauth_state");
    response.cookies.delete("watcha_oauth_intent");
    return response;
  } catch (err) {
    console.error("[Watcha OAuth] Callback error:", err);
    return oauthError(
      origin,
      err instanceof WatchaBindingConflictError
        ? "watcha_account_already_bound"
        : err instanceof Error ? err.message : "oauth_callback_failed"
    );
  }
}

function oauthError(origin: string, error: string): NextResponse {
  const response = NextResponse.redirect(
    new URL(`/?auth_error=${encodeURIComponent(error)}`, origin)
  );
  response.cookies.delete("watcha_oauth_state");
  response.cookies.delete("watcha_oauth_intent");
  return response;
}
