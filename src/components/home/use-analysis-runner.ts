import { useCallback, useRef } from "react";
import { request } from "@/lib/api/request";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";
import { getTask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";
import { auth, memory } from "@/lib/eazo-shim";
import { PHASE_LABELS, phaseForElapsed } from "./analysis-pipeline";
import type { AnalysisEntry, StreamState } from "./analysis-types";

type SetEntries = React.Dispatch<React.SetStateAction<AnalysisEntry[]>>;
type Result = { ok: boolean; error?: string; result?: { taskName?: string; rawInput?: string; subtasks?: Subtask[]; totalDays?: number; startDate?: string } };

export function useAnalysisRunner(setEntries: SetEntries) {
  const abortRef = useRef<AbortController | null>(null);
  const run = useCallback(async (taskId: string, goal: string, adjustment: string, isNew: boolean) => {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const patch = (stream: Partial<StreamState>) => setEntries((items) => items.map((item) => item.taskId === taskId ? { ...item, stream: { ...item.stream, ...stream } } : item));
    patch({ phase: "intent", label: PHASE_LABELS.intent, deltaLen: 0, errorMsg: "", startedAt: Date.now() });
    const started = Date.now();
    const ticker = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); const phase = phaseForElapsed(seconds); patch({ phase, label: PHASE_LABELS[phase], deltaLen: seconds }); }, 1000);
    try {
      const response = await request(`/api/tasks/${taskId}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adjustment ? { adjustment } : {}), signal: ctrl.signal });
      if (!response.ok) throw new Error((await response.text()) || `HTTP ${response.status}`);
      const json = await response.json() as Result;
      if (!json.ok || !json.result) throw new Error(json.error || "AI 分析未返回有效结果，请稍后重试");
      clearInterval(ticker); patch({ phase: "done" }); auth.refresh().catch(() => {});
      let task = await getTask(taskId).catch(() => null);
      if ((!task?.subtasks.length) && json.result.subtasks?.length) task = { id: taskId, userId: "", title: json.result.taskName || goal, rawInput: json.result.rawInput || goal, totalDays: json.result.totalDays || 1, status: "done", startDate: json.result.startDate ? new Date(json.result.startDate) : new Date(), createdAt: new Date(), updatedAt: new Date(), subtasks: json.result.subtasks } as TaskWithSubtasks;
      setEntries((items) => items.map((item) => item.taskId === taskId ? { ...item, task, taskTitle: json.result!.taskName || item.taskTitle, rawInput: json.result!.rawInput || item.rawInput } : item));
      if (isNew) memory.reportAction({ content: `Goal analyzed: "${goal}"`, event_type: "create" }).catch(() => {});
    } catch (error) {
      clearInterval(ticker);
      if ((error as Error).name !== "AbortError" && !(error instanceof AppAIClientUnavailableError)) patch({ phase: "error", errorMsg: error instanceof Error ? error.message : String(error) });
    }
  }, [setEntries]);
  return { abort: () => abortRef.current?.abort(), run };
}
