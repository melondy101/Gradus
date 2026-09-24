"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import {
  deleteTaskMutation,
  postponeSubtaskMutation,
} from "@/features/tasks/mutations";
import { useSubtaskRows, useTaskList } from "@/features/tasks/use-tasks";

interface Deps {
  /** 从分析流水线里摘掉这个任务的条目 */
  removeEntry: (taskId: string) => void;
  showToast: (message: string, actionLabel?: string, onAction?: () => void) => void;
}

interface DeleteTarget {
  id: string;
  title: string;
  subtaskCount: number;
}

/**
 * 子任务的「改期 / 跳过 / 删除」编排：写侧统一走 features/tasks/mutations
 * （乐观 → 回滚 → 撤销 → toast），数据变更由 tasks store 单点广播到所有视图；
 * 这里只保留待确认目标（postponeTarget、deleteTarget）等纯 UI 状态。
 */
export function useSubtaskActions({ removeEntry, showToast }: Deps) {
  const { t } = useTranslation();
  const tasksList = useTaskList();
  const subtaskRows = useSubtaskRows();
  const [postponeTarget, setPostponeTarget] = useState<SubtaskWithTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  /** 顺延一天并给撤销入口；skip 与 postpone 共用。 */
  const postponeWithUndo = useCallback(
    (row: SubtaskWithTask, done: string, failed: string, undoFailed: string) =>
      postponeSubtaskMutation({
        taskId: row.taskId,
        subtaskId: row.id,
        notify: showToast,
        messages: { done, failed, undoFailed, undoLabel: t("home.toast.undo") },
      }),
    [showToast, t]
  );

  const confirmPostpone = useCallback(
    async (row: SubtaskWithTask) => {
      setPostponeTarget(null);
      await postponeWithUndo(
        row,
        t("home.toast.postponed", { title: row.title }),
        t("home.toast.postponeFailed"),
        t("home.toast.undoFailed")
      );
    },
    [postponeWithUndo, t]
  );

  const handleSkip = useCallback(
    async (row: SubtaskWithTask) => {
      if (row.completed) return;
      // 跳过此任务：顺延排期至次日（不标记完成，不增加完成计数）
      await postponeWithUndo(
        row,
        t("home.toast.skipped", { title: row.title }),
        t("home.toast.postponeFailed", "跳过失败，请重试"),
        t("home.toast.undoFailed", "撤销失败，请重试")
      );
    },
    [postponeWithUndo, t]
  );

  const handleRequestDelete = useCallback(
    (taskId: string, title?: string, subtaskCount?: number) => {
      const taskInList = tasksList.find((x) => x.id === taskId);
      const rowsInList = subtaskRows.filter((s) => s.taskId === taskId);
      const taskTitle = title || taskInList?.title || rowsInList[0]?.taskTitle || "未命名计划";
      const count = subtaskCount ?? taskInList?.subtasks?.length ?? rowsInList.length;
      setDeleteTarget({ id: taskId, title: taskTitle, subtaskCount: count });
    },
    [tasksList, subtaskRows]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeletingTask(true);
    const res = await deleteTaskMutation(deleteTarget.id);
    if (res.ok) {
      removeEntry(deleteTarget.id);
      showToast(`已删除计划「${deleteTarget.title}」`);
      setDeleteTarget(null);
    } else {
      showToast(res.message);
    }
    setIsDeletingTask(false);
  }, [deleteTarget, removeEntry, showToast]);

  return {
    postponeTarget,
    setPostponeTarget,
    deleteTarget,
    setDeleteTarget,
    isDeletingTask,
    confirmPostpone,
    handleSkip,
    handleRequestDelete,
    handleConfirmDelete,
  };
}

export type SubtaskActions = ReturnType<typeof useSubtaskActions>;
