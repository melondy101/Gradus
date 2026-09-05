import { describe, expect, test } from "bun:test";
import { rateLimit, acquireLock } from "./rate-limit";

describe("rateLimit", () => {
  test("窗口内放行到上限后拒绝", () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  test("remaining 递减", () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 5, 60_000).remaining).toBe(4);
    expect(rateLimit(key, 5, 60_000).remaining).toBe(3);
  });

  test("窗口过期后重置", async () => {
    const key = `t:${Math.random()}`;
    expect(rateLimit(key, 1, 20).ok).toBe(true);
    expect(rateLimit(key, 1, 20).ok).toBe(false); // 同窗口内被拒
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit(key, 1, 20).ok).toBe(true); // 过期后放行
  });

  test("不同 key 相互隔离", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    expect(rateLimit(a, 1, 60_000).ok).toBe(true);
    expect(rateLimit(a, 1, 60_000).ok).toBe(false);
    expect(rateLimit(b, 1, 60_000).ok).toBe(true); // b 不受 a 影响
  });
});

describe("acquireLock", () => {
  test("持有期间同 key 再次获取失败", () => {
    const key = `lock:${Math.random()}`;
    const release = acquireLock(key, 60_000);
    expect(release).not.toBeNull();
    expect(acquireLock(key, 60_000)).toBeNull(); // 被占用
    release!();
  });

  test("释放后可再次获取", () => {
    const key = `lock:${Math.random()}`;
    const r1 = acquireLock(key, 60_000);
    expect(r1).not.toBeNull();
    r1!();
    const r2 = acquireLock(key, 60_000);
    expect(r2).not.toBeNull(); // 释放后可重新获取
    r2!();
  });

  test("release 幂等：重复调用安全", () => {
    const key = `lock:${Math.random()}`;
    const release = acquireLock(key, 60_000);
    release!();
    release!(); // 二次释放不应抛错，也不误删他人锁
    const again = acquireLock(key, 60_000);
    expect(again).not.toBeNull();
    again!();
  });

  test("ttl 过期后锁自动可用", async () => {
    const key = `lock:${Math.random()}`;
    const release = acquireLock(key, 20);
    expect(release).not.toBeNull();
    // 不主动释放，等待 ttl 过期
    await new Promise((r) => setTimeout(r, 30));
    const after = acquireLock(key, 20);
    expect(after).not.toBeNull(); // 过期后重新可获取
    after!();
  });

  test("不同 key 相互隔离", () => {
    const a = `la:${Math.random()}`;
    const b = `lb:${Math.random()}`;
    const ra = acquireLock(a, 60_000);
    expect(ra).not.toBeNull();
    const rb = acquireLock(b, 60_000); // b 不受 a 占用影响
    expect(rb).not.toBeNull();
    ra!();
    rb!();
  });
});
