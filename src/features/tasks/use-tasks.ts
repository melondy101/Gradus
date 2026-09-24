"use client";

/**
 * tasks store 的 React 订阅层（Phase 3）。
 * 消费方一律通过这里的 selector hooks 读数据，禁止再复制一份可变 state。
 */

import { useMemo, useSyncExternalStore } from "react";
import { getSubtaskRecord, getTasksSnapshot, subscribeTasks } from "./store";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";

function useTasksSnapshot() {
  return useSyncExternalStore(subscribeTasks, getTasksSnapshot, getTasksSnapshot);
}

export function useTaskList(): TaskWithSubtasks[] {
  return useTasksSnapshot().taskList;
}

export function useSubtaskRows(): SubtaskWithTask[] {
  return useTasksSnapshot().subtaskRows;
}

export function useTaskById(id: string | null | undefined): TaskWithSubtasks | undefined {
  const taskList = useTaskList();
  return useMemo(() => taskList.find((t) => t.id === id), [taskList, id]);
}

export function useSubtaskById(id: string | null | undefined): Subtask | undefined {
  // 记录不可变：未被打补丁时引用恒定，可直接作为 useSyncExternalStore 快照
  return useSyncExternalStore(subscribeTasks, () => (id ? getSubtaskRecord(id) : undefined));
}

export function useSubtaskRowById(id: string | null | undefined): SubtaskWithTask | undefined {
  const rows = useSubtaskRows();
  return useMemo(() => rows.find((r) => r.id === id), [rows, id]);
}
