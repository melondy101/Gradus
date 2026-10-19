"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchPaymentOrder, type PaymentOrderView } from "@/lib/api/commerce";

export function PaymentReturnPanel({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<PaymentOrderView | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let checks = 0;
    const check = async () => {
      try {
        const result = await fetchPaymentOrder(orderId);
        if (active) { setOrder(result); setError(""); }
        if (result.status === "paid" || ++checks >= 12) clearInterval(timer);
      } catch { if (active) setError("暂时无法确认订单，请稍后重试。"); }
    };
    const timer = setInterval(check, 5000);
    void check();
    return () => { active = false; clearInterval(timer); };
  }, [orderId]);

  async function refresh() {
    setChecking(true);
    try { setOrder(await fetchPaymentOrder(orderId)); setError(""); }
    catch { setError("暂时无法确认订单，请稍后重试。"); }
    finally { setChecking(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
    <Card className="w-full text-center">
      <h1 className="text-title-lg font-bold text-ink">付款结果</h1>
      {!orderId ? <p className="text-text-2">缺少订单编号。</p>
        : order?.status === "paid" ? <p className="text-text-2">付款已确认，权益已经到账。可以继续规划学习任务。</p>
        : <p className="text-text-2">正在核对支付宝交易结果。付款后到账可能需要片刻，请勿重复下单。</p>}
      {error && <p role="alert" className="text-body text-error">{error}</p>}
      <div className="flex justify-center gap-3">
        {orderId && order?.status !== "paid" && <Button variant="outline" size="sm" disabled={checking} onClick={refresh}>
          {checking ? "查询中…" : "刷新结果"}
        </Button>}
        <Link href="/app" className={buttonVariants({ variant: "app", size: "sm" })}>返回拾级</Link>
      </div>
    </Card>
  </main>;
}
