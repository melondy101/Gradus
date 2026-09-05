/**
 * rate-limit.ts
 *
 * 轻量进程内速率限制（滑动窗口，按 key 隔离）。
 *
 * 用途：给昂贵端点（如 AI 分析：单次触发多轮 LLM + 外部抓取）加基础限流，
 * 防止单用户高频刷量放大成本 / 造成 DoS。
 *
 * 约束与取舍：
 *   - serverless 多实例下各实例独立计数，不是全局精确限流；
 *     但对「单用户短时间狂刷」这一主要滥用场景已足够有效，且零依赖。
 *   - 需要跨实例精确限流时应改用 Redis / Upstash，成本更高，此处不引入。
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// 惰性清理：偶发清掉过期桶，避免 Map 无界增长
function sweep(now: number) {
  if (buckets.size < 500) return;
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key      隔离键（通常是 userId 或 userId:endpoint）
 * @param limit    窗口内允许的最大次数
 * @param windowMs 窗口时长（毫秒）
 */
/**
 * 写接口限流的便捷封装：命中上限时直接返回 429 Response（含 Retry-After），
 * 未命中返回 null（调用方继续处理）。统一各写端点的限流响应格式。
 *
 * @param key      隔离键（建议 `endpoint:${userId}`）
 * @param limit    窗口内允许的最大次数（默认 60）
 * @param windowMs 窗口时长（默认 60s）
 */
export function enforceRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000,
): Response | null {
  const rl = rateLimit(key, limit, windowMs);
  if (rl.ok) return null;
  return new Response(
    JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSec),
      },
    },
  );
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (hit.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { ok: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

// ─── In-flight 单飞锁 ───────────────────────────────────────────────────
//
// 用途：对「耗时且有写副作用」的操作（如 AI 分析：数十秒内多轮 LLM +
// 抓取，最后批量写子任务）防止同一 key 的并发/重复触发导致重复写入。
//
// 取舍：与 rateLimit 一样是进程内状态，serverless 多实例下非全局精确；
// 但能挡住「同实例并发 / 用户重复点击」这一主要场景，零依赖。
// 每个锁带 ttlMs 兜底自动过期，避免请求异常未释放时永久占用。

type Lock = { expiresAt: number };
const locks = new Map<string, Lock>();

/**
 * 尝试获取 in-flight 锁。
 * @returns 获取成功返回 release()；已被占用返回 null（调用方应拒绝并发请求）
 */
export function acquireLock(key: string, ttlMs = 120_000): (() => void) | null {
  const now = Date.now();
  const existing = locks.get(key);
  if (existing && existing.expiresAt > now) {
    return null; // 仍被占用
  }
  locks.set(key, { expiresAt: now + ttlMs });
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks.delete(key);
  };
}
