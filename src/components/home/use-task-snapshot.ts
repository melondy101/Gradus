"use client";

/**
 * 今日面板的数据快照：子任务 + 大任务列表的拉取、水化与刷新。
 *
 * ⚠ 所有 effect 依赖一律用 `userId`（稳定字符串），绝不依赖 user 对象引用
 *   （AGENTS.md §2：新引用会触发无限重拉循环）。
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getSubtasksWithTask, getTasksWithSubtasks } from "@/lib/api/tasks";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import type { AnalysisEntry } from "./use-analysis-panel";

interface Options {
  userId: string | null;
  entries: AnalysisEntry[];
  hydrateFromDB: (tasks: TaskWithSubtasks[]) => void;
}

export function useTaskSnapshot({ userId, entries, hydrateFromDB }: Options) {
  const [subtaskRows, setSubtaskRows] = useState<SubtaskWithTask[]>([]);
  const [tasksList, setTasksList] = useState<TaskWithSubtasks[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const prevUserIdRef = useRef<string | null>(userId ?? null);
  const prevHydratedUserRef = useRef<string | null>(null);

  const loadSubtasks = useCallback(async () => {
    setFetching(true);
    setLoadError(false);
    try {
      const [subs, tasks] = await Promise.all([
        getSubtasksWithTask(),
        getTasksWithSubtasks().catch(() => []),
      ]);
      setSubtaskRows(subs);
      setTasksList(tasks);
    } catch {
      setLoadError(true);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    const prevId = prevUserIdRef.current;
    const mode =
      !prevId && userId
        ? "LOGIN"
        : prevId && !userId
        ? "LOGOUT"
        : prevId && userId
        ? "CHANGE"
        : "LOGOUT";

    if (mode === "LOGOUT") {
      setSubtaskRows([]);
      setTasksList([]);
      return;
    }
    loadSubtasks();
  }, [userId, loadSubtasks]);

  useEffect(() => {
    prevUserIdRef.current = userId;
  }, [userId]);

  const refreshSubtasksIfIdle = useCallback(async () => {
    if (fetching) return;
    loadSubtasks();
  }, [fetching, loadSubtasks]);

  // AI 流水线跑完后刷新排期（依赖 phase 字符串拼接，避免对象引用比较）
  useEffect(() => {
    const done = entries.some((e) => e.stream.phase === "done");
    if (done && userId) {
      const timer = setTimeout(() => {
        void refreshSubtasksIfIdle();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.stream.phase).join(","), userId]);

  // 首次进入时把 DB 历史任务灌进 AI 面板（每个用户只做一次）
  useEffect(() => {
    if (!userId) return;
    if (prevHydratedUserRef.current === userId) return;
    prevHydratedUserRef.current = userId;
    getTasksWithSubtasks()
      .then((tasks) => hydrateFromDB(tasks))
      .catch(() => {});
  }, [userId, hydrateFromDB]);

  return {
    subtaskRows,
    tasksList,
    setSubtaskRows,
    setTasksList,
    fetching,
    loadError,
    loadSubtasks,
    refreshSubtasksIfIdle,
  };
}
