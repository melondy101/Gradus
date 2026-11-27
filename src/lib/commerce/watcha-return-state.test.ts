import { expect, test } from "bun:test";

import { deriveWatchaReturnState } from "./watcha-return-state";
import type { WatchaAccessView } from "@/lib/api/commerce";

function view(overrides: Partial<WatchaAccessView>): WatchaAccessView {
  return {
    ok: true, sku: "pack10", access: "purchase_required",
    remaining: null, startsAt: null, expiresAt: null,
    reason: null, purchaseUrl: null, purchaseQrUrl: null,
    ...overrides,
  };
}

/** 权益已到账必须给出确定成功态，不能只显示一个数字让用户自己比 */
test("爱猹收明确授予时是成功态", () => {
  expect(deriveWatchaReturnState(view({ access: "granted", remaining: 10 }), "")).toBe("success");
});

test("剩余次数大于 0 即视为已到账", () => {
  expect(deriveWatchaReturnState(view({ remaining: 10 }), "")).toBe("success");
});

/** 到账有延迟：未授予时是待确认，不是失败 */
test("purchase_required 且剩余为 0 时是待确认", () => {
  expect(deriveWatchaReturnState(view({ remaining: 0 }), "")).toBe("pending");
});

test("还没查到任何权益数据时是待确认", () => {
  expect(deriveWatchaReturnState(null, "")).toBe("pending");
});

test("查询出错与未查到是不同状态", () => {
  expect(deriveWatchaReturnState(view({ remaining: 0 }), "暂时无法查询权益，请稍后再试。")).toBe("error");
});
