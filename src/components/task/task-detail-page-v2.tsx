"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth, memory, useEazo } from "@/lib/eazo-shim";
import {
  getTask,
  toggleSubtask,
  updateTaskStatusApi,
  updateTaskTagsApi,
} from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { BrandPageShell } from "./brand-page-shell";
import { DetailNotice } from "./detail-notice";
import { TaskDetailScreen } from "./task-detail-screen";
import { todayOffsetOf } from "./task-dates";
import { buildSubtaskViews, type SubtaskView } from "./subtask-view-model";

interface TaskDetailPageProps {
  taskId: string;
}

/**
 * 屏二的数据容器：读取任务、乐观更新勾选与标签、鉴权与空态兜底。
 * 版面（§3 屏幕二的栅格、甘特、清单、详情面板）全部在 <TaskDetailScreen>，
 * 这里不出现任何视觉决策——所以同一块版面可以被固定样例直接实测。
 */
export function TaskDetailPage({ taskId }: TaskDetailPageProps) {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [task, setTask] = useState<TaskWithSubtasks | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 选中项：id 为 null 且未关闭时自动跟随「今天在进行中」的子任务；
  // 记 taskId 以便换任务时自然回落默认值，无需在 effect 里重置。
  const [sel, setSel] = useState<{ taskId: string; id: string | null; dismissed: boolean }>({
    taskId,
    id: null,
    dismissed: false,
  });
  const pinnedId = sel.taskId === taskId ? sel.id : null;
  const dismissed = sel.taskId === taskId ? sel.dismissed : false;

  // 依赖 user?.id（稳定字符串）而非 user 对象：useEazo 每次渲染重建 user 引用，
  // 直接依赖 user 会让 effect 在每次渲染后重跑，形成无限拉取循环（频闪 + 误报网络异常）。
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getTask(taskId)
      .then((data) => { if (!cancelled) { setFetching(false); setTask(data); } })
      .catch((e) => { if (!cancelled) { setFetching(false); setError(e.message); } });
    return () => { cancelled = true; };
  }, [taskId, userId]);

  const todayOffset = useMemo(() => todayOffsetOf(task?.startDate), [task?.startDate]);
  const views = useMemo(
    () => buildSubtaskViews(task?.subtasks ?? [], task?.startDate, todayOffset),
    [task, todayOffset]
  );

  const selectedView: SubtaskView | null = useMemo(() => {
    if (dismissed) return null;
    if (pinnedId) return views.find((v) => v.subtask.id === pinnedId) ?? null;
    return views.find((v) => v.state === "live") ?? views[0] ?? null;
  }, [views, pinnedId, dismissed]);

  const handleToggle = useCallback(
    async (subtaskId: string, current: boolean) => {
      if (!task) return;
      const next = !current;

      // 乐观更新本地状态
      const updatedSubtasks = task.subtasks.map((s) =>
        s.id === subtaskId ? { ...s, completed: next } : s
      );
      setTask((prev) => (prev ? { ...prev, subtasks: updatedSubtasks } : prev));

      await toggleSubtask(taskId, subtaskId, next).catch(() => {});

      // 全部完成后，将任务状态标记为 done
      const allDone =
        next &&
        updatedSubtasks.length > 0 &&
        updatedSubtasks.every((s) => s.completed);
      if (allDone) {
        await updateTaskStatusApi(taskId, "done").catch(() => {});
        setTask((prev) => (prev ? { ...prev, status: "done" } : prev));
      } else if (!next && task.status === "done") {
        // 取消勾选后回退状态
        await updateTaskStatusApi(taskId, "active").catch(() => {});
        setTask((prev) => (prev ? { ...prev, status: "active" } : prev));
      }

      memory
        .reportAction({
          content: `User ${next ? "completed" : "uncompleted"} subtask in task "${task.title}"`,
          event_type: next ? "complete" : "update",
        })
        .catch(() => {});
    },
    [task, taskId]
  );

  const handleUpdateTags = useCallback(
    async (newTags: string[]) => {
      if (!task) return;
      const oldTags = task.tags;
      // 乐观更新
      setTask((prev) => (prev ? { ...prev, tags: JSON.stringify(newTags) } : prev));
      try {
        await updateTaskTagsApi(taskId, newTags);
      } catch {
        // 失败回滚
        setTask((prev) => (prev ? { ...prev, tags: oldTags } : prev));
      }
    },
    [task, taskId]
  );

  const handleMarkStatus = useCallback(
    async (status: "done" | "active") => {
      await updateTaskStatusApi(taskId, status).catch(() => {});
      setTask((prev) => (prev ? { ...prev, status } : prev));
    },
    [taskId]
  );

  if (loading || fetching) {
    return (
      <BrandPageShell>
        <DetailNotice title={t("taskDetail.loading", "加载中…")} text="正在读取任务与排期" />
      </BrandPageShell>
    );
  }

  if (!user) {
    return (
      <BrandPageShell>
        <DetailNotice
          title={t("taskDetail.needAuth", "需要登录")}
          text="登录后可查看这个任务的完整排期"
          ctaLabel={t("taskDetail.signIn", "登录")}
          onCta={() => auth.login().catch(() => {})}
        />
      </BrandPageShell>
    );
  }

  if (error || !task) {
    return (
      <BrandPageShell>
        <DetailNotice
          title={t("taskDetail.notFound", "任务未找到")}
          text={error ?? "这个任务可能已被删除"}
        />
      </BrandPageShell>
    );
  }

  return (
    <TaskDetailScreen
      task={task}
      views={views}
      todayOffset={todayOffset}
      selectedId={selectedView?.subtask.id ?? null}
      onSelect={(id) => setSel({ taskId, id, dismissed: false })}
      onClear={() => setSel({ taskId, id: null, dismissed: true })}
      onToggle={handleToggle}
      onMarkDone={() => handleMarkStatus("done")}
      onReopen={() => handleMarkStatus("active")}
      onUpdateTags={handleUpdateTags}
    />
  );
}
