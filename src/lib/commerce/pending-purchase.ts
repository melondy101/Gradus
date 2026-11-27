import type { ProductSku } from "./catalog";

/**
 * 待核对的购买意图（localStorage 标记）。
 *
 * 手机端走 alipays:// 深链，付完款人留在支付宝里、不会自动回到拾级；
 * 桌面端扫码也是付完才回来。有了这个标记，用户回到任意页面时都能自动核对
 * 权益是否到账，把「支付成功」的确认从回跳页解放出来。
 */

const STORAGE_KEY = "gradus_pending_watcha_purchase";
/** 超过一天还没到账的购买不再自动核对，避免无限重试 */
export const PENDING_WATCHA_PURCHASE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingWatchaPurchase {
  sku: ProductSku;
  startedAt: number;
  /** 是否已经就「到账可能有延迟」提示过一次（每笔购买只提示一次） */
  notified: boolean;
}

/** 显式传入 storage 便于测试；缺省用全局 localStorage（隐私模式下可能抛错） */
function storageOrNull(explicit?: Storage | null): Storage | null {
  if (explicit !== undefined) return explicit;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readPendingWatchaPurchase(storage?: Storage | null): PendingWatchaPurchase | null {
  const store = storageOrNull(storage);
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingWatchaPurchase> | null;
    if (!value || typeof value.sku !== "string" || !Number.isFinite(value.startedAt)) return null;
    return {
      sku: value.sku as ProductSku,
      startedAt: Number(value.startedAt),
      notified: value.notified === true,
    };
  } catch {
    return null;
  }
}

export function writePendingWatchaPurchase(
  value: PendingWatchaPurchase,
  storage?: Storage | null,
): void {
  const store = storageOrNull(storage);
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch { /* 隐私模式下写入失败：放弃自动核对，不影响购买本身 */ }
}

export function clearPendingWatchaPurchase(storage?: Storage | null): void {
  const store = storageOrNull(storage);
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch { /* 同上 */ }
}

export function isPendingWatchaPurchaseFresh(
  value: PendingWatchaPurchase | null,
  now: number,
): boolean {
  if (!value) return false;
  return now - value.startedAt < PENDING_WATCHA_PURCHASE_MAX_AGE_MS;
}

/**
 * 发起购买后记下待核对意图。时间戳在模块内取——
 * 组件渲染作用域里调 Date.now() 会被 React Compiler 的纯度检查判违规。
 */
export function markPendingWatchaPurchase(sku: ProductSku): void {
  writePendingWatchaPurchase({ sku, startedAt: Date.now(), notified: false });
}
