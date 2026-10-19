"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { beginWatchaPurchase } from "@/lib/api/commerce";
import type { ProductSku } from "@/lib/commerce/catalog";

interface Props {
  balance: number;
  balanceVerified: boolean;
  paymentReady: boolean;
  canPurchase: boolean;
  availableSkus: string[];
}

const packs = [
  { sku: "pack10", name: "AI 规划 10 次包", count: 10 },
  { sku: "pack30", name: "AI 规划 30 次包", count: 30 },
] as const;

export function WatchaPurchaseTab({ balance, balanceVerified, paymentReady,
  canPurchase, availableSkus }: Props) {
  const [busySku, setBusySku] = useState<ProductSku | null>(null);

  async function purchase(sku: ProductSku) {
    setBusySku(sku);
    try {
      window.location.assign(await beginWatchaPurchase(sku));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "暂时无法获取购买入口");
      setBusySku(null);
    }
  }

  return <div className="space-y-5">
    <Card size="sm" tone="soft">
      <p className="text-body text-text-2">可用 AI 规划次数</p>
      <p className="text-title-lg font-bold text-ink">{balanceVerified ? `${balance} 次` : "暂未查全"}</p>
      {!balanceVerified && <p className="text-body-sm text-text-2">爱猹收余额暂时无法确认，请稍后刷新。</p>}
      <p className="text-body-sm text-text-2">完整生成与重生成各计 1 次。</p>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2">
      {packs.filter((pack) => availableSkus.includes(pack.sku)).map((pack) =>
        <Card key={pack.sku} size="sm" className="justify-between">
          <div className="space-y-2">
            <h3 className="text-body-lg font-bold text-ink">{pack.name}</h3>
            <p className="text-body-sm text-text-2">购买后增加 {pack.count} 次规划额度；请在付款页核对价格与使用规则。</p>
          </div>
          <Button variant="app" size="sm" disabled={!paymentReady || !canPurchase || busySku !== null}
            onClick={() => purchase(pack.sku)}>
            {busySku === pack.sku ? "正在获取入口…" : !canPurchase ? "请先注册登录"
              : !paymentReady ? "尚未开放" : "查看价格与购买"}
          </Button>
        </Card>)}
    </div>
    <p className="text-body-sm text-text-2">付款后返回拾级刷新余额；只有爱猹收确认权益后才能使用。专业版仍需完成权益适配。</p>
  </div>;
}
