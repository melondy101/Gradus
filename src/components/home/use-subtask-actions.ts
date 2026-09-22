"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  deleteTask,
} from "@/lib/api/tasks";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import { useSubtaskPostpone } from "./use-subtask-postpone";

interface Deps {
  tasksList: TaskWithSubtasks[];
  subtaskRows: SubtaskWithTask[];
  setTasksList: React.Dispatch<React.SetStateAction<TaskWithSubtasks[]>>;
  setSubtaskRows: React.Dispatch<React.SetStateAction<SubtaskWithTask[]>>;
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
 * 子任务的「改期 / 跳过 / 删除」写侧：乐观更新 → 失败回滚 → 可撤销提示。
 * 三者都只动 subtaskRows / tasksList 这一层本地镜像，所以整组连同
 * 待确认状态（postponeTarget、deleteTarget、isDeletingTask）一起收在这儿，
 * 今日面板只管渲染与传数据，不再自己编排这些回调。
 */
export function useSubtaskActions({
  tasksList,
  subtaskRows,
  setTasksList,
  setSubtaskRows,
  removeEntry,
  showToast,
}: Deps) {
  const { t } = useTranslation();
  const [postponeTarget, setPostponeTarget] = useState<SubtaskWithTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  /**
   * 顺延一天并给撤销入口；失败则把 startDay 改回去。skip 与 postpone 共用这一段。
   * 三段文案逐个传入：原实现里两条路径的 undoFailed 兜底串并不相同，
   * 合并时不能顺手把它们统一掉。
   */
  const postponeWithUndo = useSubtaskPostpone({
    setRows: setSubtaskRows,
    showToast,
    undoLabel: t("home.toast.undo"),
  });

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
      const taskInList = tasksList.find((t) => t.id === taskId);
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
    try {
      await deleteTask(deleteTarget.id);
      setTasksList((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setSubtaskRows((prev) => prev.filter((s) => s.taskId !== deleteTarget.id));
      removeEntry(deleteTarget.id);
      showToast(`已删除计划「${deleteTarget.title}」`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "删除失败，请稍后再试");
    } finally {
      setIsDeletingTask(false);
    }
  }, [deleteTarget, removeEntry, setSubtaskRows, setTasksList, showToast]);

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
