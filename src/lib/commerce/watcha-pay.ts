/** Server-side client for 爱猹收. Never import this module from a client component. */
export interface WatchaPayConfig {
  baseUrl: string;
  apiKey: string;
  entitlementIds: { pack10: string; pack30: string };
}

export interface WatchaAccess {
  access: "granted" | "purchase_required" | "unavailable";
  entitlement: {
    type: "quota" | "duration" | "permanent";
    remaining?: number;
    starts_at?: number;
    expires_at?: number;
  };
  purchase?: { url: string; qr_code_url?: string };
  reason?: { code?: string; message?: string };
}

export class WatchaPayError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly traceId?: string,
  ) { super(message); }
}

export function getWatchaPayConfig(): WatchaPayConfig | null {
  const apiKey = process.env.WATCHA_PAY_API_KEY?.trim();
  const pack10 = process.env.WATCHA_PAY_PACK10_ENTITLEMENT_ID?.trim();
  const pack30 = process.env.WATCHA_PAY_PACK30_ENTITLEMENT_ID?.trim();
  const baseUrl = (process.env.WATCHA_PAY_BASE_URL || "https://pay.watcha.cn").replace(/\/$/, "");
  if (!apiKey || !pack10 || !pack30 || !/^https:\/\/[^/]+$/.test(baseUrl)) return null;
  return { baseUrl, apiKey, entitlementIds: { pack10, pack30 } };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function optionalNonnegativeInteger(value: unknown): number | undefined {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined;
}

/** Only navigation targets returned by the trusted payment service are allowed. */
export function safeWatchaPurchaseUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "alipays:" && url.hostname === "platformapi" && url.pathname === "/startapp") return value;
    if (url.protocol !== "https:") return null;
    if (url.hostname === "pay.watcha.cn" || url.hostname === "alipay.com" ||
        url.hostname.endsWith(".alipay.com") || url.hostname.endsWith(".alipay.cn")) return value;
  } catch { /* invalid URL */ }
  return null;
}

export function parseWatchaAccess(value: unknown): WatchaAccess {
  const body = record(value);
  const entitlement = record(body?.entitlement);
  const purchase = record(body?.purchase);
  const reason = record(body?.reason);
  const access = body?.access;
  const type = entitlement?.type;
  if ((access !== "granted" && access !== "purchase_required" && access !== "unavailable") ||
      (type !== "quota" && type !== "duration" && type !== "permanent")) {
    throw new WatchaPayError("权益响应格式无效");
  }
  const remaining = optionalNonnegativeInteger(entitlement?.remaining);
  if (type === "quota" && remaining === undefined) throw new WatchaPayError("额度余额缺失");
  const startsAt = optionalNonnegativeInteger(entitlement?.starts_at);
  const expiresAt = optionalNonnegativeInteger(entitlement?.expires_at);
  if (type === "duration" && access === "granted" &&
      (startsAt === undefined || expiresAt === undefined || expiresAt <= startsAt)) {
    throw new WatchaPayError("时长权益有效期无效");
  }
  const purchaseUrl = purchase ? safeWatchaPurchaseUrl(purchase.url) : null;
  return {
    access,
    entitlement: {
      type,
      ...(remaining !== undefined ? { remaining } : {}),
      ...(startsAt !== undefined ? { starts_at: startsAt } : {}),
      ...(expiresAt !== undefined ? { expires_at: expiresAt } : {}),
    },
    ...(purchaseUrl ? { purchase: { url: purchaseUrl,
      ...(typeof purchase?.qr_code_url === "string" ? { qr_code_url: purchase.qr_code_url } : {}) } } : {}),
    ...(reason ? { reason: {
      ...(typeof reason.code === "string" ? { code: reason.code } : {}),
      ...(typeof reason.message === "string" ? { message: reason.message } : {}),
    } } : {}),
  };
}

async function watchaRequest(config: WatchaPayConfig, path: string, body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method: "POST", headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new WatchaPayError("权益服务暂时无法连接");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = record(record(data)?.error);
    throw new WatchaPayError("权益服务未确认请求", response.status,
      typeof error?.code === "string" ? error.code : undefined,
      response.headers.get("x-trace-id") || undefined);
  }
  return data;
}

export async function checkWatchaAccess(config: WatchaPayConfig, entitlementId: string, userId: string,
  returnUrl?: string): Promise<WatchaAccess> {
  const data = await watchaRequest(config, "/v1/entitlements/access", {
    entitlement_id: entitlementId, user_id: userId,
    ...(returnUrl ? { return_url: returnUrl } : {}),
  });
  return parseWatchaAccess(data);
}

export async function consumeWatchaQuota(config: WatchaPayConfig, entitlementId: string,
  userId: string, idempotencyKey: string): Promise<number> {
  const data = record(await watchaRequest(config, "/v1/entitlements/consume", {
    entitlement_id: entitlementId, user_id: userId, amount: 1, idempotency_key: idempotencyKey,
  }));
  const entitlement = record(data?.entitlement);
  const remaining = optionalNonnegativeInteger(entitlement?.remaining);
  if (data?.consumed !== 1 || entitlement?.type !== "quota" || remaining === undefined) {
    throw new WatchaPayError("额度扣减结果无法确认");
  }
  return remaining;
}
