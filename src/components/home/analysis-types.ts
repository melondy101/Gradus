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
  topicCategory?: string;
  stream: StreamState;
  task: TaskWithSubtasks | null;
}

export const INIT_STREAM: StreamState = { phase: "idle", label: "", deltaLen: 0, errorMsg: "" };
