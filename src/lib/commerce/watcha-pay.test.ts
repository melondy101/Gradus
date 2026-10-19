import { afterEach, expect, test } from "bun:test";
import {
  checkWatchaAccess, consumeWatchaQuota, parseWatchaAccess,
  safeWatchaPurchaseUrl, WatchaPayError, type WatchaPayConfig,
} from "./watcha-pay";

const config: WatchaPayConfig = {
  baseUrl: "https://pay.watcha.cn", apiKey: "test-only-secret",
  entitlementIds: { pack10: "ent-10", pack30: "ent-30" },
};
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("only recognized payment navigation targets are exposed", () => {
  expect(safeWatchaPurchaseUrl("https://pay.watcha.cn/buy/123")).toBeTruthy();
  expect(safeWatchaPurchaseUrl("alipays://platformapi/startapp?appId=1")).toBeTruthy();
  expect(safeWatchaPurchaseUrl("javascript:alert(1)")).toBeNull();
  expect(safeWatchaPurchaseUrl("https://pay.watcha.cn.evil.example/buy")).toBeNull();
});

test("unknown or malformed access does not open paid features", () => {
  expect(() => parseWatchaAccess({ access: "granted", entitlement: { type: "quota" } }))
    .toThrow(WatchaPayError);
  expect(() => parseWatchaAccess({ access: "granted", entitlement: { type: "duration", starts_at: 10 } }))
    .toThrow(WatchaPayError);
  expect(() => parseWatchaAccess({ access: "unexpected", entitlement: { type: "quota", remaining: 10 } }))
    .toThrow(WatchaPayError);
});

test("access uses only the server's stable user identity and entitlement", async () => {
  let request: { url?: string; headers?: Headers; body?: Record<string, unknown> } = {};
  globalThis.fetch = async (input, init) => {
    request = {
      url: String(input), headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    };
    return Response.json({ access: "purchase_required", entitlement: { type: "quota", remaining: 0 },
      purchase: { url: "https://pay.watcha.cn/buy/123" } });
  };
  const result = await checkWatchaAccess(config, "ent-10", "user-db-id");
  expect(request.url).toBe("https://pay.watcha.cn/v1/entitlements/access");
  expect(request.headers?.get("authorization")).toBe("Bearer test-only-secret");
  expect(request.body).toEqual({ entitlement_id: "ent-10", user_id: "user-db-id" });
  expect(result.purchase?.url).toBe("https://pay.watcha.cn/buy/123");
});

test("consume preserves the operation's idempotency key and fails closed on conflict", async () => {
  let body: Record<string, unknown> = {};
  globalThis.fetch = async (_input, init) => {
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({ error: { code: "insufficient_quota" } }, { status: 409 });
  };
  await expect(consumeWatchaQuota(config, "ent-10", "user-db-id", "operation-1"))
    .rejects.toMatchObject({ status: 409, code: "insufficient_quota" });
  expect(body).toEqual({ entitlement_id: "ent-10", user_id: "user-db-id",
    amount: 1, idempotency_key: "operation-1" });
});
