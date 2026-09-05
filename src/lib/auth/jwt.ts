import { jwtVerify, SignJWT } from "jose";
import { getAuthSecret, AUTH_SESSION_MAX_AGE_SECONDS } from "./env";

/**
 * JWT 负载结构。
 *
 * - `sub`: userId（与 `users.id` 对应）
 * - `name`: 用户展示名（v1 直接塞进 payload；演示版不做撤销表，刷新无须查 DB）
 * - `email`: 用户邮箱（小写归一版），同 `sub` 反查 DB
 *
 * 不存 `passwordHash` / `avatarUrl` —— 这些是私有字段，仅服务端查库读取。
 */
export interface SessionPayload {
  sub: string;
  name: string;
  email: string;
}

export interface DecodedSession extends SessionPayload {
  iat: number;
  exp: number;
}

/**
 * 签发一个 session JWT。
 * 默认 30 天过期；服务端通过 cookie Max-Age 实现"滑动续期"。
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = new TextEncoder().encode(getAuthSecret());

  return await new SignJWT({ name: payload.name, email: payload.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + AUTH_SESSION_MAX_AGE_SECONDS)
    .sign(secret);
}

/**
 * 校验 JWT，返回负载；失败返回 null（不抛）。
 *
 * 选择不抛的理由：路由 handler 想知道"无效 token" vs "合法 token"，
 * 前者需要写 Set-Cookie 清掉旧 cookie 并降级到临时账号分支。
 */
export async function verifySession(token: string): Promise<DecodedSession | null> {
  try {
    const secret = new TextEncoder().encode(getAuthSecret());
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}