"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

import { fetchWatchaAccess } from "@/lib/api/commerce";
import {
  clearPendingWatchaPurchase, isPendingWatchaPurchaseFresh,
  readPendingWatchaPurchase, writePendingWatchaPurchase,
} from "@/lib/commerce/pending-purchase";

/** 两次核对之间的最小间隔，避免 visibilitychange 连发打爆接口 */
const MIN_CHECK_INTERVAL_MS = 4000;
/** 首查延后：避开流式 hydration 窗口（sonner toast 在该窗口内发布会丢） */
const MOUNT_CHECK_DELAY_MS = 1200;

/**
 * 购买后权益到账的自动核对器（挂在根 layout，全站生效）。
 *
 * 手机端走 alipays:// 深链付款，付完人留在支付宝里，不会自动回到拾级，
 * 回跳页因此经常根本没被访问。这里在「用户回到本 tab」和「页面加载」
 * 时检查待核对标记：到账了给确定成功态（toast + 清标记），没到账就提示一次
 * 「到账有延迟」然后安静重试，而不是让用户对着一动不动的人数干瞪眼。
 */
export function PendingWatchaPurchaseWatcher() {
  const lastCheckAtRef = useRef(0);
  const inFlightRef = useRef(false);

  const check = useCallback(async () => {
    const now = Date.now();
    if (inFlightRef.current || now - lastCheckAtRef.current < MIN_CHECK_INTERVAL_MS) return;
    const pending = readPendingWatchaPurchase();
    if (!pending) return;
    if (!isPendingWatchaPurchaseFresh(pending, now)) {
      // 超龄购买不再自动核对，清掉标记避免无限重试
      clearPendingWatchaPurchase();
      return;
    }

    inFlightRef.current = true;
    lastCheckAtRef.current = now;
    try {
      const result = await fetchWatchaAccess(pending.sku);
      const granted = result.access === "granted" || (result.remaining ?? 0) > 0;
      if (granted) {
        clearPendingWatchaPurchase();
        toast.success(`支付已到账 · 当前可用 ${result.remaining ?? 0} 次`);
        return;
      }
      if (!pending.notified) {
        writePendingWatchaPurchase({ ...pending, notified: true });
        toast.info("付款已收到，权益到账通常有几分钟延迟；回到拾级会自动核对", { duration: 8000 });
      }
    } catch {
      // 查询失败：保留标记，下次回到可见再试
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 首查延后到页面稳定之后：挂载瞬间正好在流式 hydration 窗口里，
    // sonner 的 toast 在那个窗口发布会被丢弃（订阅方的 flushSync 撞上 hydration）。
    // 用户从支付宝切回来走的是 visibility/focus 事件，不受此影响。
    const timer = setTimeout(() => void check(), MOUNT_CHECK_DELAY_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [check]);

  return null;
}
