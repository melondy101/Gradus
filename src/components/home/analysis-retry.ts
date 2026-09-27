import type { AnalysisEntry } from "./analysis-types";

export type AnalysisRetry =
  | { kind: "create"; goal: string; tags: string[] }
  | { kind: "reanalyze"; taskId: string; adjustment: string };

/**
 * 临时条目没有数据库任务，不能请求 /api/tasks/:id/analyze。
 * 重试必须回到创建任务的起点，成功后才会获得可分析的 UUID。
 */
export function getAnalysisRetry(
  entry: Pick<AnalysisEntry, "taskId" | "rawInput" | "tags">,
  adjustment: string,
): AnalysisRetry {
  if (entry.taskId.startsWith("temp-")) {
    return { kind: "create", goal: entry.rawInput, tags: entry.tags ?? [] };
  }

  return { kind: "reanalyze", taskId: entry.taskId, adjustment };
}
