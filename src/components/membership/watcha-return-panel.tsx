"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchWatchaAccess, type WatchaAccessView } from "@/lib/api/commerce";
import { clearPendingWatchaPurchase } from "@/lib/commerce/pending-purchase";
import { deriveWatchaReturnState } from "@/lib/commerce/watcha-return-state";
import type { ProductSku } from "@/lib/commerce/catalog";

const POLL_INTERVAL_MS = 5000;
/** 权益到账有分钟级延迟，60 秒远远不够：给到约 3 分钟，超时后转人工指引 */
const MAX_POLLS = 36;

/**
 * 购买回跳页（爱猹收）。
 *
 * 三态而不是一个数字：成功（权益已到账）/ 待确认（到账有延迟，自动轮询）/
 * 查询失败。页面返回本身不代表付款成功，权益到账才代表——这条以前埋在文案里，
 * 用户付完款对着「还可生成 0 次」完全不知道自己该等还是该找谁。
 */
export function WatchaReturnPanel({ sku }: { sku: ProductSku }) {
  const [access, setAccess] = useState<WatchaAccessView | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [polls, setPolls] = useState(0);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const result = await fetchWatchaAccess(sku);
      setAccess(result);
      setError("");
    } catch {
      setError("暂时无法查询权益，请稍后再试。");
    } finally {
      setChecking(false);
    }
  }, [sku]);

  const state = deriveWatchaReturnState(access, error);
  const timedOut = state === "pending" && polls >= MAX_POLLS;

  // 到账即停轮询；出错继续重试；超时停止并转人工指引。首查立即执行，之后每 5 秒一次
  useEffect(() => {
    if (state === "success" || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      void check().then(() => setPolls((count) => count + 1));
    }, polls === 0 ? 0 : POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [state, polls, check]);

  // 到账后清掉待核对标记，避免回到 App 再弹一次 toast
  useEffect(() => {
    if (state === "success") clearPendingWatchaPurchase();
  }, [state]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16">
      <Card className="w-full text-center">
        {state === "success" ? (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success">
              <CheckCircle2 size={24} />
            </span>
            <h1 className="mt-4 text-title-lg font-bold text-ink">支付成功 · 权益已到账</h1>
            <p className="mt-2 text-body text-text-2">
              爱猹收已确认该次数包，剩余{" "}
              <b className="font-bold text-ink">{access?.remaining ?? 0}</b>{" "}
              次。会员中心的可用次数已同步更新。
            </p>
          </>
        ) : state === "error" ? (
          <>
            <h1 className="text-title-lg font-bold text-ink">权益查询失败</h1>
            <p role="alert" className="mt-2 text-body text-error">{error}</p>
            <p className="mt-2 text-body-sm text-text-2">
              付款状态以支付宝账单与爱猹收后台为准；查询恢复后可再次核对。
            </p>
          </>
        ) : (
          <>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-cream-light text-text-2">
              <Clock size={22} />
            </span>
            <h1 className="mt-4 text-title-lg font-bold text-ink">
              {timedOut ? "权益尚未确认" : "正在核对权益到账"}
            </h1>
            <p className="mt-2 text-body text-text-2">
              {timedOut
                ? "爱猹收暂未确认权益到账。到账通常有几分钟延迟，请稍后回到会员中心查看可用次数；若长时间未到账，请联系支持并提供支付宝交易号。"
                : "付款成功后权益到账通常有几分钟延迟，页面会自动查询（约 3 分钟）。查到即到账，不必停留等待；回到拾级也会自动核对。"}
            </p>
          </>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={checking}
            onClick={() => {
              setPolls(0);
              void check();
            }}
          >
            {checking ? "查询中…" : "刷新权益"}
          </Button>
          <Link href="/app" className={buttonVariants({ variant: "app", size: "sm" })}>
            返回拾级
          </Link>
        </div>
      </Card>
    </main>
  );
}
