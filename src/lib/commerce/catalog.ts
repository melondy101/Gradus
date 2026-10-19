export const COMMERCE_PRODUCTS = {
  pack10: { sku: "pack10", name: "AI 规划 10 次包", amountCents: 990, credits: 10, validityDays: 180 },
  pack30: { sku: "pack30", name: "AI 规划 30 次包", amountCents: 2490, credits: 30, validityDays: 180 },
  pro30: { sku: "pro30", name: "专业版 Pro 30 天", amountCents: 3990, credits: 40, validityDays: 30 },
} as const;

export type ProductSku = keyof typeof COMMERCE_PRODUCTS;

export function getProduct(sku: string) {
  return Object.hasOwn(COMMERCE_PRODUCTS, sku) ? COMMERCE_PRODUCTS[sku as ProductSku] : null;
}

/** Disabled by default, including on self-hosted deployments. */
export function commerceEnabled() {
  return process.env.GRADUS_COMMERCE_ENABLED === "true";
}

export function paymentProvider(): "alipay" | "watcha" {
  return process.env.GRADUS_PAYMENT_PROVIDER === "watcha" ? "watcha" : "alipay";
}
