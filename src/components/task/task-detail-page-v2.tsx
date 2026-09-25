"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth, useSessionUser } from "@/lib/auth-shim";
import {
  getTask,
  updateTaskTagsApi,
  updateTaskStatusApi,
} from "@/lib/api/tasks";
import { toggleSubtaskMutation } from "@/features/tasks/mutations";
import {
  getTaskRecord,
  patchTask,
  upsertTaskWithSubtasks,
} from "@/features/tasks/store";
import { useTaskById } from "@/features/tasks/use-tasks";
import { BrandPageShell } from "./brand-page-shell";
import { DetailNotice } from "./detail-notice";
import { TaskDetailScreen } from "./task-detail-screen";
import { todayOffsetOf } from "./task-dates";
import { buildSubtaskViews, type SubtaskView } from "./subtask-view-model";
import { useToast } from "@/components/home/use-toast";

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
  const user = useSessionUser((s) => s.auth.user);
  const task = useTaskById(taskId);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  // 选中项：id 为 null 且未关闭时自动跟随「今天在进行中」的子任务；
  // 记 taskId 以便换任务时自然回落默认值，无需在 effect 里重置。
  const [sel, setSel] = useState<{ taskId: string; id: string | null; dismissed: boolean }>({
    taskId,
    id: null,
    dismissed: false,
  });
  const pinnedId = sel.taskId === taskId ? sel.id : null;
  const dismissed = sel.taskId === taskId ? sel.dismissed : false;

  // 依赖 user?.id（稳定字符串）而非 user 对象：useSessionUser 每次渲染重建 user 引用，
  // 直接依赖 user 会让 effect 在每次渲染后重跑，形成无限拉取循环（频闪 + 误报网络异常）。
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getTask(taskId)
      .then((data) => { if (!cancelled) { setFetching(false); upsertTaskWithSubtasks(data); } })
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
      const next = !current;
      // 打卡统一走 features/tasks/mutations：乐观 + 回滚 + 任务状态级联 + stats 增量，
      // store 广播即刷新本页甘特/清单/详情面板。
      const outcome = await toggleSubtaskMutation({
        taskId,
        subtaskId,
        current,
        notify: showToast,
        messages: {
          markDoneFailed: t("home.toast.markDoneFailed", "标记完成失败，已恢复原状态"),
          markUndoneFailed: t("home.toast.markUndoneFailed", "取消完成失败，已恢复原状态"),
          taskStatusFailed: t("home.toast.taskStatusFailed", "任务状态更新失败，已恢复原状态"),
        },
      });
      if (!outcome.ok) return;
    },
    [taskId, showToast, t]
  );

  const handleUpdateTags = useCallback(
    async (newTags: string[]) => {
      const cur = getTaskRecord(taskId);
      if (!cur) return;
      const oldTags = cur.tags;
      // 乐观更新
      patchTask(taskId, { tags: JSON.stringify(newTags) });
      try {
        await updateTaskTagsApi(taskId, newTags);
      } catch {
        // 失败回滚
        patchTask(taskId, { tags: oldTags });
        showToast("标签保存失败，已恢复原标签");
      }
    },
    [taskId, showToast]
  );

  const handleMarkStatus = useCallback(
    async (status: "done" | "active") => {
      const cur = getTaskRecord(taskId);
      if (!cur) return;
      const prevStatus = cur.status;
      patchTask(taskId, { status });
      try {
        await updateTaskStatusApi(taskId, status);
      } catch {
        patchTask(taskId, { status: prevStatus });
        showToast("任务状态更新失败，请重试");
      }
    },
    [taskId, showToast]
  );

  if (fetching) {
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
    <>
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
    </>
  );
}
