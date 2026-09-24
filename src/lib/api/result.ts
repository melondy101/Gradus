"use client";

// 统一 API 契约（审计 §4.4）：数据服务层每个端点走 apiFetch，返回可判别的
// ApiResult<T>，组件层不再直接摆弄 Response / 裸 throw 文本。
// 网络/中断/401 三类边界显式建模；app_ai_unavailable 的 402 toast 仍由
// request→appAIRequest 层抛专用错误，这里原样上抛，不吞成 http 错误。

export type ApiErrorKind = "http" | "network" | "aborted";

export type ApiResult<T> =
  | { ok: true; status: number; data: T; response: Response }
  | {
      ok: false;
      kind: ApiErrorKind;
      status: number | null;
      message: string;
      response: Response | null;
      /** 错误响应若为 JSON 信封，解析后附上（429 的 waitSeconds、登录 merged 等） */
      data?: unknown;
    };

export type ApiFetchTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

// 默认走 request()（x-app-locale 头 + appAIRequest 的 402 兜底）。
// 懒加载：request 链路会带进 eazo-shim/i18n/sonner，单元测试注入 transport 时不必加载。
let transport: ApiFetchTransport | null = null;

export function setApiFetchTransport(next: ApiFetchTransport | null): void {
  transport = next;
}

async function defaultTransport(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const { request } = await import("@/lib/api/request");
  return request(input, init);
}

/** 从错误响应体里尽量抽出人话：JSON 的 error/message 优先，退回原文/状态码。 */
export async function extractErrorMessage(res: Response): Promise<string> {
  let fallback = `HTTP ${res.status}`;
  try {
    const raw = await res.text();
    if (raw) {
      fallback = raw;
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string };
        const msg = parsed?.error || parsed?.message;
        if (msg) return msg;
      } catch {
        /* 非 JSON 就用原文 */
      }
    }
  } catch {
    /* body 读取失败保留状态码 */
  }
  return fallback;
}

export async function apiFetch<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const send = transport ?? defaultTransport;
  let res: Response;
  try {
    res = await send(input, init);
  } catch (err) {
    const { AppAIClientUnavailableError } = await import(
      "@/lib/api/app-ai-request"
    );
    if (err instanceof AppAIClientUnavailableError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, kind: "aborted", status: null, message: "请求已取消", response: null };
    }
    return { ok: false, kind: "network", status: null, message: "网络异常，请稍后再试", response: null };
  }
  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.clone().json();
    } catch {
      /* 错误体不是 JSON 就不附 data */
    }
    return {
      ok: false,
      kind: "http",
      status: res.status,
      message: await extractErrorMessage(res),
      response: res,
      ...(data !== undefined ? { data } : {}),
    };
  }
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    return { ok: false, kind: "http", status: res.status, message: "响应不是有效 JSON", response: res };
  }
  return { ok: true, status: res.status, data, response: res };
}

/** 给沿用 throw 语义的旧调用面（tasks.ts 等）收口错误抽取。 */
export async function unwrap<T>(result: ApiResult<T>): Promise<T> {
  if (result.ok) return result.data;
  throw new Error(result.message);
}
