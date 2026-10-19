import { request } from "./request";
import type { ProductSku } from "@/lib/commerce/catalog";

export interface PaymentOrderView {
  id: string;
  sku: string;
  amountCents: number;
  status: string;
  paidAt: string | null;
  createdAt?: string;
}

export async function startPurchase(sku: ProductSku, clientKey: string) {
  const response = await request("/api/payments/orders", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku, clientKey }),
  });
  return response.json() as Promise<{ ok?: boolean; error?: string; orderId?: string; paymentUrl?: string }>;
}

export async function fetchPaymentOrders(): Promise<PaymentOrderView[]> {
  const response = await request("/api/payments/orders");
  if (!response.ok) throw new Error("订单加载失败");
  const result = await response.json() as { orders: PaymentOrderView[] };
  return result.orders;
}

export async function fetchPaymentOrder(id: string): Promise<PaymentOrderView> {
  const response = await request(`/api/payments/orders/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("订单状态查询失败");
  const result = await response.json() as { order: PaymentOrderView };
  return result.order;
}

export interface WatchaAccessView {
  ok: boolean;
  sku: ProductSku;
  access: "granted" | "purchase_required" | "unavailable";
  remaining: number | null;
  startsAt: number | null;
  expiresAt: number | null;
  reason: string | null;
  purchaseUrl: string | null;
}

export async function fetchWatchaAccess(sku: ProductSku): Promise<WatchaAccessView> {
  const response = await request(`/api/payments/watcha/access?sku=${encodeURIComponent(sku)}`);
  const result = await response.json() as WatchaAccessView & { error?: string };
  if (!response.ok || !result.ok) throw new Error(result.error || "权益状态查询失败");
  return result;
}

export async function beginWatchaPurchase(sku: ProductSku): Promise<string> {
  const response = await request("/api/payments/watcha/access", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sku }),
  });
  const result = await response.json() as WatchaAccessView & { error?: string };
  if (!response.ok || !result.ok || !result.purchaseUrl) {
    throw new Error(result.error || (result.access === "granted" ? "当前权益已开通" : "暂时无法获取购买入口"));
  }
  return result.purchaseUrl;
}
