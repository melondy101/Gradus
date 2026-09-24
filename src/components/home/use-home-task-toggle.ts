"use client";

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { getTasksSnapshot } from "@/features/tasks/store";
import { toggleSubtaskMutation, type Notify } from "@/features/tasks/mutations";
import { encourageMessage, crossedMilestone, type Level } from "@/lib/growth";
import type { CongratsData } from "./congrats-modal";

interface HomeTaskToggleOpts {
  notify: Notify;
  patchPanel: (taskId: string, subtaskId: string, completed: boolean) => void;
  setCongrats: (data: CongratsData | null) => void;
  setMilestone: (level: Level | null) => void;
}

/**
 * 首页打卡编排：mutation 走 features/tasks/mutations 统一乐观更新，
 * 页面层只消费 outcome 做祝贺弹窗、里程碑/鼓励 toast 这些 UI 副作用。
 */
export function useHomeTaskToggle(opts: HomeTaskToggleOpts) {
  const { t } = useTranslation();
  const { notify, patchPanel, setCongrats, setMilestone } = opts;

  return useCallback(
    async (taskId: string, subtaskId: string, current: boolean, silent = false) => {
      const outcome = await toggleSubtaskMutation({
        taskId,
        subtaskId,
        current,
        notify,
        messages: {
          markDoneFailed: t("home.toast.markDoneFailed"),
          markUndoneFailed: t("home.toast.markUndoneFailed"),
          taskStatusFailed: t(
            "home.toast.taskStatusFailed",
            "任务状态更新失败，请稍后重试"
          ),
        },
        patchPanel,
      });
      if (!outcome.ok) return;

      if (outcome.allDone) {
        const rows = getTasksSnapshot().subtaskRows.filter(
          (s) => s.taskId === taskId
        );
        setCongrats({
          taskId,
          taskTitle: rows[0]?.taskTitle ?? "",
          subtasks: rows,
        });
      }

      if (
        !silent &&
        !outcome.allDone &&
        outcome.statsBefore != null &&
        outcome.statsAfter != null
      ) {
        const crossed = crossedMilestone(outcome.statsBefore, outcome.statsAfter);
        if (crossed) {
          setMilestone(crossed);
        } else {
          notify(
            encourageMessage(outcome.todayCountAfter ?? 0, outcome.statsAfter)
          );
        }
      }
    },
    [notify, patchPanel, setCongrats, setMilestone, t]
  );
}
