import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { TrustableResource } from "@/lib/tavily";

export type Resource = TrustableResource;
export type Phase = "idle" | "intent" | "search" | "plan" | "validate" | "revise" | "saving" | "done" | "error";

export interface StreamState {
  phase: Phase;
  label: string;
  deltaLen: number;
  errorMsg: string;
  startedAt?: number;
}

export interface AnalysisEntry {
  taskId: string;
  taskTitle: string;
  rawInput: string;
  /** 创建失败后重试需要保留原来的任务标签。 */
  tags?: string[];
  topicCategory?: string;
  stream: StreamState;
  task: TaskWithSubtasks | null;
}

export const INIT_STREAM: StreamState = { phase: "idle", label: "", deltaLen: 0, errorMsg: "" };
