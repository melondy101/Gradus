import { useCallback, useRef } from "react";
import { postAnalyze } from "@/lib/api/analyze";
import { getTask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { auth } from "@/lib/auth-shim";
import { PHASE_LABELS, phaseForElapsed } from "./analysis-pipeline";
import type { AnalysisEntry, StreamState } from "./analysis-types";

type SetEntries = React.Dispatch<React.SetStateAction<AnalysisEntry[]>>;

export function useAnalysisRunner(setEntries: SetEntries) {
  const abortRef = useRef<AbortController | null>(null);
  const run = useCallback(async (taskId: string, goal: string, adjustment: string) => {
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const patch = (stream: Partial<StreamState>) => setEntries((items) => items.map((item) => item.taskId === taskId ? { ...item, stream: { ...item.stream, ...stream } } : item));
    patch({ phase: "intent", label: PHASE_LABELS.intent, deltaLen: 0, errorMsg: "", startedAt: Date.now() });
    const started = Date.now();
    const ticker = setInterval(() => { const seconds = Math.floor((Date.now() - started) / 1000); const phase = phaseForElapsed(seconds); patch({ phase, label: PHASE_LABELS[phase], deltaLen: seconds }); }, 1000);
    try {
      const outcome = await postAnalyze(taskId, { adjustment: adjustment || undefined, signal: ctrl.signal });
      clearInterval(ticker);
      if (!outcome.ok) {
        // 用户主动取消保持静默（与原 AbortError 分支一致）
        if (!ctrl.signal.aborted) patch({ phase: "error", errorMsg: outcome.message });
        return;
      }
      const result = outcome.result;
      patch({ phase: "done" }); auth.refresh().catch(() => {});
      let task = await getTask(taskId).catch(() => null);
      if ((!task?.subtasks.length) && result.subtasks?.length) task = { id: taskId, userId: "", title: result.taskName || goal, rawInput: result.rawInput || goal, totalDays: result.totalDays || 1, status: "done", startDate: result.startDate ? new Date(result.startDate) : new Date(), createdAt: new Date(), updatedAt: new Date(), subtasks: result.subtasks } as TaskWithSubtasks;
      setEntries((items) => items.map((item) => item.taskId === taskId ? { ...item, task, taskTitle: result.taskName || item.taskTitle, rawInput: result.rawInput || item.rawInput } : item));
    } catch (error) {
      clearInterval(ticker);
      if ((error as Error).name !== "AbortError") patch({ phase: "error", errorMsg: error instanceof Error ? error.message : String(error) });
    }
  }, [setEntries]);
  return { abort: () => abortRef.current?.abort(), run };
}
