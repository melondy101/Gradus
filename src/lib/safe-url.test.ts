import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { isSafeExternalUrl } from "./safe-url";

let browserWindow: Window;

beforeEach(() => {
  browserWindow = new Window({ url: "https://app.example.test" });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow,
  });
});

afterEach(() => {
  // @ts-expect-error 清理注入的全局 window
  delete globalThis.window;
});

describe("isSafeExternalUrl", () => {
  test("放行 http/https 绝对链接", () => {
    expect(isSafeExternalUrl("http://example.com")).toBe(true);
    expect(isSafeExternalUrl("https://example.com/a?b=1")).toBe(true);
  });

  test("拒绝 javascript: 伪协议（DOM XSS 主要向量）", () => {
    expect(isSafeExternalUrl("javascript:alert(document.cookie)")).toBe(false);
    expect(isSafeExternalUrl("JavaScript:alert(1)")).toBe(false);
  });

  test("拒绝 data: / vbscript: / file:", () => {
    expect(isSafeExternalUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeExternalUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeExternalUrl("file:///etc/passwd")).toBe(false);
  });

  test("拒绝空 / 非字符串 / 空白", () => {
    expect(isSafeExternalUrl("")).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
    // 纯空白经 URL 解析会失败或落到 origin，非 http/https 时应拒绝
    expect(isSafeExternalUrl("   ")).toBe(false);
  });

  test("相对路径按 origin 解析为 https，视为安全", () => {
    // 相对链接会解析到 https://app.example.test，协议 https → 安全
    expect(isSafeExternalUrl("/docs/guide")).toBe(true);
  });
});
