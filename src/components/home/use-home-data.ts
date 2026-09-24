"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTasksWithSubtasks } from "@/lib/api/tasks";
import { loadTasks, resetTasks } from "@/features/tasks/store";
import type { AnalysisEntry } from "./analysis-types";

interface HomeDataOpts {
  /** 只依赖 user?.id 稳定字符串；传整个 user 对象会触发重拉循环（AGENTS.md §2） */
  userId: string | null;
  entries: AnalysisEntry[];
  hydrateFromDB: (tasks: Awaited<ReturnType<typeof getTasksWithSubtasks>>) => void;
  /** 登出/切账号时的 UI 复位（详情弹窗等瞬态） */
  onLoggedOut: () => void;
}

/**
 * 首页数据加载：单请求水化 tasks store + 分析面板，账号切换复位，
 * 分析「进行中 → done」相位跃迁后自动刷新。
 */
export function useHomeData(opts: HomeDataOpts) {
  const { userId, entries, hydrateFromDB, onLoggedOut } = opts;
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const prevUserIdRef = useRef<string | null>(userId);
  const onLoggedOutRef = useRef(onLoggedOut);
  useEffect(() => {
    onLoggedOutRef.current = onLoggedOut;
  }, [onLoggedOut]);

  const loadSubtasks = useCallback(async () => {
    setFetching(true);
    setLoadError(false);
    try {
      // 单请求重建全部派生视图（Phase 3 验收：首屏 tasks 相关请求 2 → 1）
      const tasks = await getTasksWithSubtasks();
      loadTasks(tasks);
      hydrateFromDB(tasks);
    } catch {
      setLoadError(true);
    } finally {
      setFetching(false);
    }
  }, [hydrateFromDB]);

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
      // 切账号清空白 store，防止跨账号残留（分析面板条目与详情弹窗一并复位）
      resetTasks();
      onLoggedOutRef.current();
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

  // 分析完成时刷新：只响应「进行中 → done」的相位跃迁；
  // hydrate 注入的既有 done 条目不算完成事件，避免首屏为此多发一次拉取。
  const prevPhasesRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const prev = prevPhasesRef.current;
    const next = new Map<string, string>();
    let transitioned = false;
    for (const e of entries) {
      next.set(e.taskId, e.stream.phase);
      const before = prev.get(e.taskId);
      if (e.stream.phase === "done" && before !== undefined && before !== "done") {
        transitioned = true;
      }
    }
    prevPhasesRef.current = next;
    if (!transitioned || !userId) return;
    const timer = setTimeout(() => {
      void refreshSubtasksIfIdle();
    }, 0);
    return () => clearTimeout(timer);
  }, [entries, userId, refreshSubtasksIfIdle]);

  return { fetching, loadError, loadSubtasks };
}
