"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMMERCE_PRODUCTS, type ProductSku } from "@/lib/commerce/catalog";
import { fetchPaymentOrders, startPurchase, type PaymentOrderView } from "@/lib/api/commerce";

interface Props {
  balance: number;
  paymentReady: boolean;
  canPurchase: boolean;
}

const details: Record<ProductSku, string> = {
  pack10: "10 次完整生成或重生成，有效期 180 天",
  pack30: "30 次完整生成或重生成，有效期 180 天",
  pro30: "30 天专业版，最多 5 个任务，含 40 次 AI 规划，每天最多使用 4 次会员额度",
};

export function PurchaseTab({ balance, paymentReady, canPurchase }: Props) {
  const [orders, setOrders] = useState<PaymentOrderView[]>([]);
  const [busySku, setBusySku] = useState<ProductSku | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    fetchPaymentOrders().then(setOrders).catch(() => toast.error("订单记录暂时无法加载"))
      .finally(() => setLoadingOrders(false));
  }, []);

  async function purchase(sku: ProductSku) {
    setBusySku(sku);
    try {
      const result = await startPurchase(sku, crypto.randomUUID());
      if (!result.ok || !result.paymentUrl) throw new Error(result.error || "无法创建订单");
      window.location.assign(result.paymentUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "购买暂不可用");
      setBusySku(null);
    }
  }

  return (
    <div className="space-y-5">
      <Card size="sm" tone="soft">
        <p className="text-body text-text-2">当前可用 AI 规划次数</p>
        <p className="text-title-lg font-bold text-ink">{balance} 次</p>
        <p className="text-body-sm text-text-2">完整生成与重生成各计 1 次；生成失败会归还预留次数。</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(COMMERCE_PRODUCTS) as ProductSku[]).map((sku) => {
          const product = COMMERCE_PRODUCTS[sku];
          return <Card key={sku} size="sm" className="justify-between">
            <div className="space-y-2">
              <h3 className="text-body-lg font-bold text-ink">{product.name}</h3>
              <p className="text-title-md font-bold text-ink">¥{(product.amountCents / 100).toFixed(2)}</p>
              <p className="text-body-sm text-text-2">{details[sku]}</p>
            </div>
            <Button variant="app" size="sm" disabled={!paymentReady || !canPurchase || busySku !== null}
              onClick={() => purchase(sku)}>
              {busySku === sku ? "正在创建订单…" : !canPurchase ? "请先注册登录" : !paymentReady ? "尚未开放" : "去支付宝付款"}
            </Button>
          </Card>;
        })}
      </div>
      <p className="text-body-sm text-text-2">专业版为单次购买，有效期 30 天，不自动续费。次数包可与专业版叠加；过期未用次数失效。</p>
      <div className="space-y-2">
        <h3 className="text-body font-bold text-ink">最近订单</h3>
        {loadingOrders ? <p className="text-body-sm text-text-2">正在加载…</p> : orders.length === 0
          ? <p className="text-body-sm text-text-2">暂无订单</p>
          : orders.map((order) => <div key={order.id} className="flex items-center justify-between rounded-field border border-bd-card px-3 py-2 text-body-sm text-text-2">
            <span>{COMMERCE_PRODUCTS[order.sku as ProductSku]?.name ?? order.sku} · ¥{(order.amountCents / 100).toFixed(2)}</span>
            <span>{order.status === "paid" ? "已支付" : order.status === "pending" ? "待支付" : "已关闭"}</span>
          </div>)}
      </div>
    </div>
  );
}
