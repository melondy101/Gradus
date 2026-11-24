"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { beginWatchaPurchase } from "@/lib/api/commerce";
import { COMMERCE_PRODUCTS, type ProductSku } from "@/lib/commerce/catalog";
import { WatchaPayDialog, prefersMobileApp } from "./watcha-pay-dialog";

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

/**
 * 观猹（爱猹收）购买页签
 *
 * FB-04：桌面浏览器不能再跳 alipays:// 深链（ERR_UNKNOWN_URL_SCHEME），改为弹二维码。
 * FB-11：价格直接显示在卡片上，不用点进付款页才知道。
 */
export function WatchaPurchaseTab({ balance, balanceVerified, paymentReady,
  canPurchase, availableSkus }: Props) {
  const [busySku, setBusySku] = useState<ProductSku | null>(null);
  const [payEntry, setPayEntry] = useState<{ name: string; price: string; url: string; qrUrl: string | null } | null>(null);

  async function purchase(sku: ProductSku) {
    setBusySku(sku);
    try {
      const entry = await beginWatchaPurchase(sku);
      const product = COMMERCE_PRODUCTS[sku];
      const price = `¥${(product.amountCents / 100).toFixed(2)}`;
      const name = product.name;
      if (prefersMobileApp()) {
        // 移动端：深链本来就是为唤起支付宝设计的，直接跳
        window.location.assign(entry.url);
        return;
      }
      // 桌面端：深链会报 ERR_UNKNOWN_URL_SCHEME，改为弹二维码
      setPayEntry({ name, price, url: entry.url, qrUrl: entry.qrUrl });
      setBusySku(null);
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
      <p className="text-body-sm text-text-2">完整生成与重生成各计 1 次；免费额度先用 3 次，之后每天再送 1 次。</p>
    </Card>
    <div className="grid gap-3 sm:grid-cols-2">
      {packs.filter((pack) => availableSkus.includes(pack.sku)).map((pack) => {
        const product = COMMERCE_PRODUCTS[pack.sku as ProductSku];
        const price = `¥${(product.amountCents / 100).toFixed(2)}`;
        return (
          <Card key={pack.sku} size="sm" className="justify-between">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-body-lg font-bold text-ink">{pack.name}</h3>
                <p className="text-title-md font-bold text-ink">{price}</p>
              </div>
              <p className="text-body-sm text-text-2">
                购买后增加 {pack.count} 次规划额度，180 天内有效，可与专业版叠加。
              </p>
            </div>
            <Button variant="app" size="sm" disabled={!paymentReady || !canPurchase || busySku !== null}
              onClick={() => purchase(pack.sku)}>
              {busySku === pack.sku ? "正在获取入口…" : !canPurchase ? "请先注册登录"
                : !paymentReady ? "尚未开放" : "扫码购买"}
            </Button>
          </Card>
        );})}
    </div>
    <p className="text-body-sm text-text-2">付款后返回拾级刷新余额；只有爱猹收确认权益后才能使用。桌面端扫码，手机端唤起支付宝。</p>

    {payEntry && (
      <WatchaPayDialog
        open
        onClose={() => setPayEntry(null)}
        name={payEntry.name}
        price={payEntry.price}
        url={payEntry.url}
        qrUrl={payEntry.qrUrl}
      />
    )}
  </div>;
}
