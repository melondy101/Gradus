import { jwtVerify, SignJWT } from "jose";
import { getAuthSecret } from "@/lib/auth/env";

export interface CalendarTokenPayload {
  sub: string; // userId
  purpose: "calendar_feed";
}

/**
 * 签发一个专属的日历订阅 Token（有效期 365 天）。
 * 外部日历客户端（Apple Calendar / Google Calendar / 飞书 / Outlook）
 * 通过 ?token=xxx 访问订阅端点，无需依赖网页 Cookie。
 */
export async function signCalendarToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(getAuthSecret());

  return await new SignJWT({ purpose: "calendar_feed" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + 365 * 24 * 60 * 60) // 1 年有效
    .sign(secret);
}

/**
 * 校验日历订阅 Token，解出对应的 userId；失败返回 null。
 */
export async function verifyCalendarToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(getAuthSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (
      typeof payload.sub === "string" &&
      payload.purpose === "calendar_feed"
    ) {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}
