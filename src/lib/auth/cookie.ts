import { AUTH_COOKIE_NAME, AUTH_SESSION_MAX_AGE_SECONDS } from "./env";

/**
 * `__Host-session` Cookie 工具。
 *
 * 设计：
 *   - `__Host-` 前缀要求浏览器强制 `Secure` + `Path=/` + 不带 `Domain`，
 *     否则**整条 cookie 被静默丢弃**（见 buildSetSessionCookie 的说明）。
 *   - `httpOnly`：阻止 XSS 偷 cookie。
 *   - `SameSite=Lax`：默认请求带 cookie，但拦截跨站 POST。
 *   - 30 天 Max-Age，通过 Set-Cookie 滑动续期。
 *
 * 这里**不直接接 Next.js API**：路由 handler 拿到的 `Request` 是 Web Fetch Request，
 * 不能像 `res.cookie()` 那样挂 cookie。返回 `Set-Cookie` 字符串，由调用方写到 Response
 * header。
 */

function baseAttrs(): string[] {
  // `Secure` 必须常驻：`__Host-` 前缀的 cookie 少了它会被浏览器直接丢弃，
  // 表现为「登录接口返回 200、下一个请求却 401」且无任何报错。
  // localhost 属于可信源（secure context），`Secure` 在本地开发同样被接受，
  // 所以这里不再按 NODE_ENV 开关。真正的明文 HTTP 源（如局域网 IP）本来
  // 也存不下 `__Host-` cookie，用 HTTPS 访问即可。
  return [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Secure`];
}

/** 把 token 写入 session cookie。返回可直接 set 到 Response header 的 Set-Cookie 字符串。 */
export function buildSetSessionCookie(token: string): string {
  const maxAge = `Max-Age=${AUTH_SESSION_MAX_AGE_SECONDS}`;
  return [
    `${AUTH_COOKIE_NAME}=${token}`,
    maxAge,
    ...baseAttrs(),
  ].join("; ");
}

/** 清除 session cookie（注销时使用）。 */
export function buildClearSessionCookie(): string {
  return [
    `${AUTH_COOKIE_NAME}=`,
    `Max-Age=0`,
    ...baseAttrs(),
  ].join("; ");
}

/**
 * 客户端：从 `Request` 的 Cookie header 中读取 session token。
 * 同时兼容 dev 偶尔漏写的 lower-case `__host-session`（防 🐞）。
 */
export function readSessionCookieFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;

  const parts = header.split(/;\s*/);
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name === AUTH_COOKIE_NAME || name === AUTH_COOKIE_NAME.toLowerCase()) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

/**
 * 服务端 helper —— 直接给 Response 追加 Set-Cookie 头。
 * 多个调用会累积（Next.js 允许重复 `set-cookie` 头），最后在 App Router
 * handler 中通过 `NextResponse` headers 透传。
 */
export function appendSetCookie(headers: Headers, value: string): void {
  headers.append("set-cookie", value);
}