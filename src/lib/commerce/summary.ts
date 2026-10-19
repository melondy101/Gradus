import { commerceEnabled, paymentProvider } from "./catalog";
import { getAlipayConfig } from "./alipay";
import { getCreditBalance } from "./credits";
import { getWatchaPayConfig } from "./watcha-pay";
import { getWatchaQuotaBalance } from "./watcha-quota";

export async function getCommerceSummary(userId: string, canPurchase: boolean) {
  if (!commerceEnabled()) return {
    enabled: false, provider: paymentProvider(), paymentReady: false,
    canPurchase: false, balance: 0, balanceVerified: true,
    availableSkus: [] as string[],
  };
  const localBalance = await getCreditBalance(userId);
  if (paymentProvider() === "alipay") return {
    enabled: true, provider: "alipay" as const, paymentReady: Boolean(getAlipayConfig()),
    canPurchase, balance: localBalance, balanceVerified: true,
    availableSkus: ["pack10", "pack30", "pro30"],
  };
  const config = getWatchaPayConfig();
  if (!config || !canPurchase) return {
    enabled: true, provider: "watcha" as const, paymentReady: Boolean(config),
    canPurchase, balance: localBalance, balanceVerified: !canPurchase,
    availableSkus: ["pack10", "pack30"],
  };
  try {
    const remoteBalance = await getWatchaQuotaBalance(config, userId);
    return {
      enabled: true, provider: "watcha" as const, paymentReady: true,
      canPurchase, balance: localBalance + remoteBalance, balanceVerified: true,
      availableSkus: ["pack10", "pack30"],
    };
  } catch {
    return {
      enabled: true, provider: "watcha" as const, paymentReady: true,
      canPurchase, balance: localBalance, balanceVerified: false,
      availableSkus: ["pack10", "pack30"],
    };
  }
}
