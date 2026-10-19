"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchWatchaAccess, type WatchaAccessView } from "@/lib/api/commerce";
import type { ProductSku } from "@/lib/commerce/catalog";

export function WatchaReturnPanel({ sku }: { sku: ProductSku }) {
  const [access, setAccess] = useState<WatchaAccessView | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    let checks = 0;
    const check = async () => {
      try {
        const result = await fetchWatchaAccess(sku);
        if (active) { setAccess(result); setError(""); }
      } catch { if (active) setError("暂时无法查询权益，请稍后再试。"); }
      if (++checks >= 12) clearInterval(timer);
    };
    const timer = setInterval(check, 5000);
    void check();
    return () => { active = false; clearInterval(timer); };
  }, [sku]);

  async function refresh() {
    setChecking(true);
    try { setAccess(await fetchWatchaAccess(sku)); setError(""); }
    catch { setError("暂时无法查询权益，请稍后再试。"); }
    finally { setChecking(false); }
  }

  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
    <Card className="w-full text-center">
      <h1 className="text-title-lg font-bold text-ink">购买后权益核对</h1>
      {access?.remaining !== null && access?.remaining !== undefined
        ? <p className="text-body text-text-2">爱猹收当前确认该次数包剩余 {access.remaining} 次。请核对购买前后的余额。</p>
        : <p className="text-body text-text-2">正在向爱猹收查询最新权益。页面返回本身不代表付款成功。</p>}
      {error && <p role="alert" className="text-body text-error">{error}</p>}
      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={checking} onClick={refresh}>
          {checking ? "查询中…" : "刷新权益"}
        </Button>
        <Link href="/app" className={buttonVariants({ variant: "app", size: "sm" })}>返回拾级</Link>
      </div>
    </Card>
  </main>;
}
