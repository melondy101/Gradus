import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tasks, users } from "@/lib/db/schema";
import { getUserByEmailLower, getUserById } from "@/lib/db/queries";
import { signSession, verifySession } from "@/lib/auth/jwt";
import {
  buildSetSessionCookie,
  readSessionCookieFromRequest,
} from "@/lib/auth/cookie";

/**
 * GET /api/auth/oauth/watcha/callback
 * 处理观猹（Watcha.cn）OAuth 2.0 回调
 */
export async function GET(request: NextRequest) {
  const origin =
    request.nextUrl.origin ||
    request.headers.get("x-forwarded-host") ||
    "https://watcha.cn";
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (error) {
    console.error("[Watcha OAuth] Error from provider:", error, errorDescription);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(errorDescription || error)}`, origin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/?auth_error=missing_authorization_code", origin)
    );
  }

  // 校验 state 防 CSRF
  const savedState = request.cookies.get("watcha_oauth_state")?.value;
  if (savedState && state && savedState !== state) {
    return NextResponse.redirect(
      new URL("/?auth_error=state_mismatch", origin)
    );
  }

  const clientId = process.env.WATCHA_CLIENT_ID?.trim();
  const clientSecret = process.env.WATCHA_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/?auth_error=watcha_oauth_not_configured", origin)
    );
  }

  const redirectUri = `${origin}/api/auth/oauth/watcha/callback`;
  const tokenUrl =
    process.env.WATCHA_TOKEN_URL?.trim() || "https://watcha.cn/oauth/token";
  const userinfoUrl =
    process.env.WATCHA_USERINFO_URL?.trim() || "https://watcha.cn/api/user/info";

  try {
    // 1. 用 code 换取 access_token
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      return NextResponse.redirect(
        new URL(
          `/?auth_error=${encodeURIComponent(
            tokenData.message || tokenData.error || "token_exchange_failed"
          )}`,
          origin
        )
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

    const userInfo = (await userRes.json().catch(() => ({}))) as {
      id?: string;
      openid?: string;
      name?: string;
      nickname?: string;
      email?: string;
      avatar?: string;
      avatar_url?: string;
    };

    const watchaUid = userInfo.openid || userInfo.id || openId;
    if (!watchaUid) {
      return NextResponse.redirect(
        new URL("/?auth_error=unable_to_get_watcha_user_id", origin)
      );
    }

    const watchaName =
      userInfo.nickname || userInfo.name || `观猹用户_${String(watchaUid).slice(0, 6)}`;
    const watchaEmail = userInfo.email?.trim() || "";
    const watchaAvatar = userInfo.avatar_url || userInfo.avatar || null;

    // 3. 查重 / 匹配用户
    let existingUser = null;

    // 优先通过 watchaOpenId 查找
    const usersByOpenId = await db
      .select()
      .from(users)
      .where(eq(users.watchaOpenId, String(watchaUid)))
      .limit(1);

    if (usersByOpenId.length > 0) {
      existingUser = usersByOpenId[0];
    } else if (watchaEmail) {
      // 其次通过邮箱匹配
      const byEmail = await getUserByEmailLower(watchaEmail.toLowerCase());
      if (byEmail) {
        existingUser = byEmail;
        // 绑定 watchaOpenId
        await db
          .update(users)
          .set({ watchaOpenId: String(watchaUid) })
          .where(eq(users.id, byEmail.id));
      }
    }

    // 4. 检查当前是否有临时访客账号，准备合并任务
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

    let finalUserId = "";
    let finalEmail = "";
    let finalName = "";

    if (existingUser) {
      finalUserId = existingUser.id;
      finalEmail = existingUser.email || "";
      finalName = existingUser.name || watchaName;

      // 如果有临时账号数据，合并到现有账号
      if (tempUserId && tempUserId !== finalUserId) {
        await db
          .update(tasks)
          .set({ userId: finalUserId, updatedAt: new Date() })
          .where(eq(tasks.userId, tempUserId));
        await db.delete(users).where(eq(users.id, tempUserId));
      }
    } else {
      // 创建新用户
      finalUserId = crypto.randomUUID();
      finalEmail = watchaEmail || `watcha_${String(watchaUid).slice(0, 8)}@watcha.user`;
      finalName = watchaName;

      await db.transaction(async (tx) => {
        await tx.insert(users).values({
          id: finalUserId,
          email: finalEmail,
          emailLower: finalEmail.toLowerCase(),
          name: finalName,
          passwordHash: "",
          avatarUrl: watchaAvatar,
          watchaOpenId: String(watchaUid),
        });

        if (tempUserId) {
          await tx
            .update(tasks)
            .set({ userId: finalUserId, updatedAt: new Date() })
            .where(eq(tasks.userId, tempUserId));
          await tx.delete(users).where(eq(users.id, tempUserId));
        }
      });
    }

    // 5. 签发 JWT 会话 Cookie
    const sessionToken = await signSession({
      sub: finalUserId,
      name: finalName,
      email: finalEmail,
    });

    const response = NextResponse.redirect(new URL("/?auth_success=1", origin));
    response.headers.append("set-cookie", buildSetSessionCookie(sessionToken));
    response.cookies.delete("watcha_oauth_state");

    return response;
  } catch (err) {
    console.error("[Watcha OAuth] Callback error:", err);
    return NextResponse.redirect(
      new URL(
        `/?auth_error=${encodeURIComponent(
          err instanceof Error ? err.message : "oauth_callback_failed"
        )}`,
        origin
      )
    );
  }
}
