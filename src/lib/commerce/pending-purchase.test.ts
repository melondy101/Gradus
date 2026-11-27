import { expect, test } from "bun:test";

import {
  clearPendingWatchaPurchase, isPendingWatchaPurchaseFresh,
  PENDING_WATCHA_PURCHASE_MAX_AGE_MS,
  readPendingWatchaPurchase, writePendingWatchaPurchase,
  type PendingWatchaPurchase,
} from "./pending-purchase";

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => { map.delete(key); },
    setItem: (key: string, value: string) => { map.set(key, value); },
  } as Storage;
}

const marker: PendingWatchaPurchase = { sku: "pack10", startedAt: 1_000_000, notified: false };

test("写入后可读回同一笔待核对购买", () => {
  const storage = fakeStorage();
  writePendingWatchaPurchase(marker, storage);
  expect(readPendingWatchaPurchase(storage)).toEqual(marker);
});

test("没有标记时读到的 null，不抛错", () => {
  expect(readPendingWatchaPurchase(fakeStorage())).toBeNull();
});

test("存储被禁用（抛错）时安全降级为 null", () => {
  const hostile = {
    getItem() { throw new Error("storage disabled"); },
    setItem() { throw new Error("storage disabled"); },
    removeItem() { throw new Error("storage disabled"); },
  } as unknown as Storage;
  expect(readPendingWatchaPurchase(hostile)).toBeNull();
  expect(() => writePendingWatchaPurchase(marker, hostile)).not.toThrow();
  expect(() => clearPendingWatchaPurchase(hostile)).not.toThrow();
});

test("标记可清除", () => {
  const storage = fakeStorage();
  writePendingWatchaPurchase(marker, storage);
  clearPendingWatchaPurchase(storage);
  expect(readPendingWatchaPurchase(storage)).toBeNull();
});

test("24 小时内的标记算新鲜，超龄不算", () => {
  const now = marker.startedAt + PENDING_WATCHA_PURCHASE_MAX_AGE_MS - 1;
  expect(isPendingWatchaPurchaseFresh(marker, now)).toBe(true);
  expect(isPendingWatchaPurchaseFresh(marker, marker.startedAt + PENDING_WATCHA_PURCHASE_MAX_AGE_MS + 1)).toBe(false);
  expect(isPendingWatchaPurchaseFresh(null, now)).toBe(false);
});

test("损坏的 JSON 不会让读取崩溃", () => {
  expect(readPendingWatchaPurchase(fakeStorage({ gradus_pending_watcha_purchase: "{oops" }))).toBeNull();
});
