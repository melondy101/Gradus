import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAlipayConfig, merchantTradeNo, parseYuanCents, queryTrade } from "@/lib/commerce/alipay";
import { fulfillPaymentOrder, getOwnedOrder } from "@/lib/commerce/orders";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  let order = await getOwnedOrder(auth.userId, id);
  if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
  const config = getAlipayConfig();
  if (order.status === "pending" && config) {
    try {
      const trade = await queryTrade(order.id, config);
      if (trade?.code === "10000" && trade.out_trade_no === merchantTradeNo(order.id) &&
          parseYuanCents(trade.total_amount ?? "") === order.amountCents &&
          (!trade.seller_id || trade.seller_id === config.sellerId) && trade.trade_no &&
          (trade.trade_status === "TRADE_SUCCESS" || trade.trade_status === "TRADE_FINISHED")) {
        order = await fulfillPaymentOrder(order.id, trade.trade_no);
      }
    } catch (error) {
      console.warn("[commerce] payment query pending", error);
    }
  }
  return NextResponse.json({ ok: true, order: {
    id: order.id, sku: order.sku, amountCents: order.amountCents,
    status: order.status, paidAt: order.paidAt,
  } });
}
