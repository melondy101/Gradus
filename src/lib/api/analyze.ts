"use client";

// /api/tasks/:id/analyze typed client（审计 §4.4：消灭 use-analysis-runner 的 request 半绕过）。
// 流水线是长请求，必须支持 AbortSignal；网络/取消等错误由 apiFetch 归一到
// ApiResult，这里原样返回给 runner 的阶段机分支。

import { apiFetch } from "@/lib/api/result";
import type { Subtask } from "@/lib/db/schema";

export interface AnalyzeResultPayload {
  taskName?: string;
  rawInput?: string;
  subtasks?: Subtask[];
  totalDays?: number;
  startDate?: string;
}

export interface AnalyzeEnvelope {
  ok: boolean;
  error?: string;
  result?: AnalyzeResultPayload;
}

export type AnalyzeOutcome =
  | { ok: true; result: AnalyzeResultPayload }
  | { ok: false; message: string };

export async function postAnalyze(
  taskId: string,
  options: { adjustment?: string; signal?: AbortSignal } = {},
): Promise<AnalyzeOutcome> {
  const { adjustment, signal } = options;
  const res = await apiFetch<AnalyzeEnvelope>(`/api/tasks/${taskId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(adjustment ? { adjustment } : {}),
    signal,
  });
  if (!res.ok) {
    return res.kind === "aborted"
      ? { ok: false, message: "请求已取消" }
      : { ok: false, message: res.message };
  }
  if (!res.data.ok || !res.data.result) {
    return { ok: false, message: res.data.error || "AI 分析未返回有效结果，请稍后重试" };
  }
  return { ok: true, result: res.data.result };
}
