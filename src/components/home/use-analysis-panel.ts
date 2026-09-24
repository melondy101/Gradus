"use client";
import { useCallback, useState } from "react";
import { createTask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { INIT_STREAM, type AnalysisEntry, type Phase } from "./analysis-types";
import { useAnalysisRunner } from "./use-analysis-runner";
export type { AnalysisEntry, Phase, Resource, StreamState } from "./analysis-types";
export { getEtaLabel, isRunningPhase, PIPELINE_STAGES, stageIndexOf } from "./analysis-pipeline";

export function useAnalysisPanel() {
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const { abort, run } = useAnalysisRunner(setEntries);
  const startAnalysis = useCallback(async (goal: string, tags: string[] = []) => {
    if (!goal.trim()) return;
    abort(); const tempId = `temp-${Date.now()}`;
    try {
      const task = await createTask(goal.trim(), tags);
      setEntries((items) => [{ taskId: task.id, taskTitle: goal.trim(), rawInput: goal.trim(), stream: INIT_STREAM, task: null }, ...items]);
      setFocusedId(task.id); await run(task.id, goal.trim(), "", true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setEntries((items) => [{ taskId: tempId, taskTitle: goal.trim(), rawInput: goal.trim(), stream: { phase: "error", label: "创建失败", deltaLen: 0, errorMsg }, task: null }, ...items]); setFocusedId(tempId);
    }
  }, [abort, run]);
  const regenAnalysis = useCallback((taskId: string, adjustment: string) => {
    abort(); setEntries((items) => { const entry = items.find((item) => item.taskId === taskId); if (entry) void run(taskId, entry.rawInput, adjustment, false); return items.map((item) => item.taskId === taskId ? { ...item, task: null, stream: INIT_STREAM } : item); }); setFocusedId(taskId);
  }, [abort, run]);
  const removeEntry = useCallback((taskId: string) => { setEntries((items) => items.filter((item) => item.taskId !== taskId)); setFocusedId((current) => current === taskId ? null : current); }, []);
  const hydrateFromDB = useCallback((tasks: TaskWithSubtasks[]) => setEntries((items) => { const ids = new Set(items.map((item) => item.taskId)); const added = tasks.filter((task) => !ids.has(task.id) && task.subtasks.length).map((task) => ({ taskId: task.id, taskTitle: task.title, rawInput: task.rawInput || task.title, topicCategory: (task.subtasks[0] as { topic?: string }).topic, stream: { ...INIT_STREAM, phase: "done" as Phase }, task })); return added.length ? [...items, ...added] : items; }), []);
  const focusTask = useCallback((taskId: string) => setFocusedId(taskId), []);
  const patchSubtaskCompleted = useCallback((taskId: string, subtaskId: string, completed: boolean) => setEntries((items) => items.map((item) => item.taskId !== taskId || !item.task ? item : { ...item, task: { ...item.task, subtasks: item.task.subtasks.map((subtask) => subtask.id === subtaskId ? { ...subtask, completed } : subtask) } })), []);
  return { entries, focusedId, setFocusedId, startAnalysis, regenAnalysis, removeEntry, hydrateFromDB, focusTask, patchSubtaskCompleted };
}

export type AnalysisPanel = ReturnType<typeof useAnalysisPanel>;
