import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { paymentOrders } from "@/lib/db/schema";
import { getAlipayConfig, orderIdFromTradeNo, parseYuanCents, verifyNotify } from "@/lib/commerce/alipay";
import { fulfillPaymentOrder } from "@/lib/commerce/orders";

const fail = () => new Response("fail", { status: 400, headers: { "Content-Type": "text/plain" } });

/** Public callback: authentication is the RSA2 notification signature. */
export async function POST(request: NextRequest) {
  const config = getAlipayConfig();
  if (!config) return fail();
  const raw = await request.text();
  if (raw.length > 16_384) return fail();
  const form = new URLSearchParams(raw);
  const params: Record<string, string> = Object.create(null);
  for (const [key, value] of form) {
    if (Object.hasOwn(params, key)) return fail();
    params[key] = value;
  }
  if (!verifyNotify(params, config.publicKey)) return fail();
  const orderId = orderIdFromTradeNo(params.out_trade_no ?? "");
  if (!orderId || params.app_id !== config.appId || params.seller_id !== config.sellerId ||
      params.notify_type !== "trade_status_sync") return fail();
  const [order] = await db.select().from(paymentOrders).where(eq(paymentOrders.id, orderId)).limit(1);
  if (!order || parseYuanCents(params.total_amount ?? "") !== order.amountCents) return fail();
  if (!params.trade_no || !/^\d{10,64}$/.test(params.trade_no)) return fail();
  if (params.trade_status === "TRADE_SUCCESS" || params.trade_status === "TRADE_FINISHED") {
    try { await fulfillPaymentOrder(order.id, params.trade_no); }
    catch (error) { console.error("[commerce] verified payment fulfillment failed", error); return fail(); }
  }
  return new Response("success", { headers: { "Content-Type": "text/plain" } });
}
