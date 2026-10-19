import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isTempUser } from "@/lib/membership/quota";
import { commerceEnabled, getProduct, paymentProvider } from "@/lib/commerce/catalog";
import { getAlipayConfig, paymentUrl } from "@/lib/commerce/alipay";
import { createPaymentOrder, listPaymentOrders } from "@/lib/commerce/orders";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, orders: await listPaymentOrders(auth.userId) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  if (!commerceEnabled() || paymentProvider() !== "alipay") {
    return NextResponse.json({ error: "该支付方式尚未开通" }, { status: 503 });
  }
  if (isTempUser(auth.user)) return NextResponse.json({ error: "请先注册或登录，再购买权益" }, { status: 403 });
  const config = getAlipayConfig();
  if (!config) return NextResponse.json({ error: "支付尚未开通" }, { status: 503 });
  const body = await request.json().catch(() => null) as { sku?: unknown; clientKey?: unknown } | null;
  const product = typeof body?.sku === "string" ? getProduct(body.sku) : null;
  if (!product || typeof body?.clientKey !== "string" || !/^[0-9a-f-]{36}$/i.test(body.clientKey)) {
    return NextResponse.json({ error: "商品或请求编号无效" }, { status: 400 });
  }
  try {
    const order = await createPaymentOrder(auth.userId, product.sku, body.clientKey);
    if (order.status !== "pending") return NextResponse.json({ error: "该订单已经处理" }, { status: 409 });
    return NextResponse.json({ ok: true, orderId: order.id, paymentUrl: paymentUrl({
      id: order.id, amountCents: order.amountCents, name: product.name,
    }, config) });
  } catch (error) {
    console.error("[commerce] order creation failed", error);
    return NextResponse.json({ error: "订单创建失败，请稍后重试" }, { status: 500 });
  }
}
