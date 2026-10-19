import {
  checkWatchaAccess, WatchaPayError, type WatchaAccess, type WatchaPayConfig,
} from "./watcha-pay";

export type WatchaQuotaSku = "pack10" | "pack30";

function checkedQuota(access: WatchaAccess) {
  if (access.entitlement.type !== "quota") throw new WatchaPayError("商品权益类型不是额度包");
  if (access.access === "unavailable" && access.reason?.code !== "purchasing_suspended") {
    throw new WatchaPayError("额度权益暂时不可用");
  }
  return access.entitlement.remaining ?? 0;
}

export async function getWatchaQuotaBalance(config: WatchaPayConfig, userId: string) {
  const [pack10, pack30] = await Promise.all([
    checkWatchaAccess(config, config.entitlementIds.pack10, userId),
    checkWatchaAccess(config, config.entitlementIds.pack30, userId),
  ]);
  return checkedQuota(pack10) + checkedQuota(pack30);
}

/** Select a funded quota; the eventual consume call is still the authority. */
export async function selectWatchaQuota(config: WatchaPayConfig, userId: string) {
  const results = await Promise.allSettled(([
    ["pack10", config.entitlementIds.pack10],
    ["pack30", config.entitlementIds.pack30],
  ] as const).map(async ([sku, entitlementId]) => ({
    sku, entitlementId,
    remaining: checkedQuota(await checkWatchaAccess(config, entitlementId, userId)),
  })));
  const funded = results.find((result) => result.status === "fulfilled" && result.value.remaining > 0);
  if (funded?.status === "fulfilled") return funded.value;
  if (results.some((result) => result.status === "rejected")) throw new WatchaPayError("额度余额无法确认");
  return null;
}
