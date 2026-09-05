import { countRecentAttempts, pruneOldAttempts, recordAuthAttempt } from "@/lib/db/queries";

/**
 * 注册/登录滑动窗口限流。
 *
 * 策略（演示版权衡）：
 *   - 窗口 60s，阈值 5 次 / IP / kind。
 *   - kind 维度：`register` 与 `login` 共用阈值（避免独立调参 / 撞一边的 quota）。
 *   - 数据存 `auth_attempts` 表，serverless 友好（冷启动不会丢状态）。
 *   - 每次查询前先 prune 早于 60s 的旧记录（演示版 QPS 低，开销可忽略）。
 *   - allowed 路径：直接 insert 一条；
 *     denied 路径：返回 `{ allowed: false }` 不写表（已被拒的请求不应占用配额）。
 *
 * 不做的事（v1 范围外）：
 *   - 按账号锁定
 *   - CAPTCHA / Turnstile
 *   - 滑动窗口的精确数学（这里用"过去 60 秒内的尝试数"近似）
 */

const WINDOW_SECONDS = 60;
const THRESHOLD = 5;

export interface RateLimitOptions {
  /** 用于结构化日志的 metadata（email 等） */
  email?: string;
  /** User-Agent，用于日志 */
  ua?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number; // 0 表示本窗口已用尽
}

/**
 * 检查并（如果允许）记录一次 auth 尝试。
 *
 * 返回值设计：
 *   - `allowed: true`  —— 调用方继续业务逻辑（register/login）
 *   - `allowed: false` —— 调用方应直接返回 429
 *
 * 每次都打结构化日志 `[auth] <kind> attempt ip=... email=... ua=...`。
 */
export async function checkRateLimit(
  ip: string,
  kind: "register" | "login",
  opts: RateLimitOptions = {},
): Promise<RateLimitResult> {
  // 1) 前置清理：删除早于窗口的旧记录
  try {
    await pruneOldAttempts(WINDOW_SECONDS);
  } catch (err) {
    // 清理失败不应阻塞主流程；记录错误但不抛
    console.warn(`[auth] ${kind} pruneOldAttempts failed:`, err);
  }

  // 2) 查当前窗口计数（包含即将插入的本条）
  const recent = await countRecentAttempts(ip, kind, WINDOW_SECONDS);

  if (recent >= THRESHOLD) {
    console.log(
      `[auth] ${kind} attempt ip=${ip} email=${opts.email ?? "-"} ua=${opts.ua ?? "-"} → DENIED (recent=${recent})`,
    );
    return { allowed: false, remaining: 0 };
  }

  // 3) 记录本次尝试
  await recordAuthAttempt({
    id: crypto.randomUUID(),
    ip,
    kind,
  });

  const remaining = Math.max(0, THRESHOLD - recent - 1);
  console.log(
    `[auth] ${kind} attempt ip=${ip} email=${opts.email ?? "-"} ua=${opts.ua ?? "-"} → allowed (remaining=${remaining})`,
  );

  return { allowed: true, remaining };
}

/**
 * 取客户端真实 IP。
 *
 * Vercel / Cloudflare / Nginx 都把原始 IP 放进 `x-forwarded-for` 第一段。
 * 回退顺序：`x-forwarded-for[0]` → `x-real-ip` → `"unknown"`。
 *
 * 演示版权衡：不做 IP 校验（信任 header），生产场景应该至少 trim/parse。
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}