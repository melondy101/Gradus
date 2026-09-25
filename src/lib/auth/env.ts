/**
 * Auth 模块的环境变量校验。
 *
 * `AUTH_SECRET` 是 JWT 签发 / 校验的 HS256 密钥。它**必须存在**且**≥ 32 字符**，
 * 否则一旦发布到生产环境就会被攻击者伪造 token——这是最危险的安全事故之一。
 *
 * 实现策略（刻意**惰性**，非模块加载时校验）：
 *   - 只有在真正要签名 / 校验 JWT 时才 resolve 并校验，避免在构建期
 *     （`next build` 收集页面数据时）因缺少该变量而把整个构建打断——
 *     因为 `AUTH_SECRET` 这类密钥通常只注入到**运行时**环境，构建镜像本身不持有。
 *   - 通过 `getAuthSecret()` 在请求路径上触发；缺失/过短会在首个需要签名的
 *     请求上抛出，并打印明确指引（含生成命令）。
 *   - 测试/REPL 场景如果想跳过校验，可设 `AUTH_SECRET_ALLOW_INSECURE=1`，
 *     此时 secret 会被替换为一个稳定的本地占位串。**仅供本地手测。**
 */

const MIN_LENGTH = 32;

declare global {
  // eslint-disable-next-line no-var
  var __authSecret: string | undefined;
}

function resolveSecret(): string {
  const raw = process.env.AUTH_SECRET;
  const allowInsecure = process.env.AUTH_SECRET_ALLOW_INSECURE === "1";

  if (raw && raw.length >= MIN_LENGTH) {
    return raw;
  }

  // 注意：这里必须是 `allowInsecure || NODE_ENV !== "production"`，不能带上
  // `|| !raw`。带上之后「完全没配」和「配了但太短」行为不一致——后者抛错、
  // 前者静默用公开占位串，等于生产环境拿着一个仓库里人人可见的常量当签名密钥，
  // 可被任意伪造 __Host-session 冒充任何 userId。
  if (allowInsecure || process.env.NODE_ENV !== "production") {
    // 32+ 字符占位符，确保 jwt 签名在开发环境可以正常走通。
    const placeholder = "insecure-dev-only-do-not-use-in-prod-32+chars";
    return placeholder;
  }

  throw new Error(
    `AUTH_SECRET environment variable is required and must be at least ${MIN_LENGTH} characters.\n` +
      `Generate one with:  openssl rand -hex 32\n` +
      `Then set it in .env / Vercel project settings.`,
  );
}

/**
 * 惰性解析并校验 `AUTH_SECRET`。
 * 仅在真正需要（签名/校验 JWT）时调用；结果按进程缓存。
 */
export function getAuthSecret(): string {
  if (globalThis.__authSecret === undefined) {
    globalThis.__authSecret = resolveSecret();
  }
  return globalThis.__authSecret;
}

export const AUTH_COOKIE_NAME = "__Host-session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 天

export function requireAuthSecret(): string {
  return getAuthSecret();
}