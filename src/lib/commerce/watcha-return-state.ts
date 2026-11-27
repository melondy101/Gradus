import type { WatchaAccessView } from "@/lib/api/commerce";

export type WatchaReturnState = "success" | "pending" | "error";

/**
 * 购买回跳页的三态推导。
 *
 * 爱猹收的权益到账是异步的（分钟级延迟），「未授予」≠「付款失败」，
 * 所以 purchase_required 只能算待确认；只有明确授予或剩余次数大于 0 才是成功。
 */
export function deriveWatchaReturnState(
  access: WatchaAccessView | null,
  error: string,
): WatchaReturnState {
  if (error) return "error";
  if (!access) return "pending";
  if (access.access === "granted" || (access.remaining ?? 0) > 0) return "success";
  return "pending";
}
