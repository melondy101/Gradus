import { afterEach, describe, expect, test } from "bun:test";
import {
  apiFetch,
  extractErrorMessage,
  setApiFetchTransport,
  unwrap,
  type ApiFetchTransport,
} from "@/lib/api/result";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function withTransport(fn: () => Promise<Response>): ApiFetchTransport {
  return async () => fn();
}

afterEach(() => setApiFetchTransport(null));

describe("apiFetch 统一契约", () => {
  test("2xx + JSON → ok:true 带解析数据", async () => {
    setApiFetchTransport(withTransport(async () => jsonResponse(200, { ok: true, n: 7 })));
    const res = await apiFetch<{ ok: boolean; n: number }>("/api/x");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.n).toBe(7);
  });

  test("业务错误优先取 JSON 信封的 error/message", async () => {
    setApiFetchTransport(withTransport(async () => jsonResponse(400, { error: "邮箱已注册" })));
    const res = await apiFetch("/api/x");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe("http");
      expect(res.status).toBe(400);
      expect(res.message).toBe("邮箱已注册");
    }
  });

  test("非 JSON 错误体退回原文；空体退回 HTTP 状态", async () => {
    setApiFetchTransport(withTransport(async () => new Response("boom", { status: 500 })));
    const text = await apiFetch("/api/x");
    if (text.ok) throw new Error("expected failure");
    expect(text.message).toBe("boom");

    setApiFetchTransport(withTransport(async () => new Response(null, { status: 502 })));
    const empty = await apiFetch("/api/x");
    if (empty.ok) throw new Error("expected failure");
    expect(empty.message).toBe("HTTP 502");
  });

  test("transport 抛错 → network；AbortError → aborted", async () => {
    setApiFetchTransport(withTransport(async () => {
      throw new TypeError("fetch failed");
    }));
    const net = await apiFetch("/api/x");
    if (net.ok) throw new Error("expected failure");
    expect(net.kind).toBe("network");
    expect(net.status).toBeNull();

    setApiFetchTransport(withTransport(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    }));
    const aborted = await apiFetch("/api/x");
    if (aborted.ok) throw new Error("expected failure");
    expect(aborted.kind).toBe("aborted");
  });

  test("app_ai_unavailable 专用错误原样上抛，不被吞成结果", async () => {
    setApiFetchTransport(withTransport(async () => {
      throw new AppAIClientUnavailableError();
    }));
    await expect(apiFetch("/api/x")).rejects.toBeInstanceOf(AppAIClientUnavailableError);
  });

  test("unwrap：ok 返回数据，失败抛 message", async () => {
    setApiFetchTransport(withTransport(async () => jsonResponse(200, { a: 1 })));
    expect(await unwrap(await apiFetch<{ a: number }>("/api/x"))).toEqual({ a: 1 });

    setApiFetchTransport(withTransport(async () => jsonResponse(401, { error: "未登录" })));
    await expect(unwrap(await apiFetch("/api/x"))).rejects.toThrow("未登录");
  });

  test("错误分支透传 JSON 信封数据（429 waitSeconds 等）", async () => {
    setApiFetchTransport(
      withTransport(async () =>
        jsonResponse(429, { error: "操作过于频繁", waitSeconds: 30 }),
      ),
    );
    const res = await apiFetch<{ waitSeconds?: number }>("/api/x");
    if (res.ok) throw new Error("expected failure");
    expect(res.status).toBe(429);
    expect(res.data).toEqual({ error: "操作过于频繁", waitSeconds: 30 });
  });

  test("extractErrorMessage 对已读流安全兜底", async () => {
    expect(await extractErrorMessage(jsonResponse(403, { message: "禁止" }))).toBe("禁止");
  });
});
