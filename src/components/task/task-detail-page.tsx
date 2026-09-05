"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEazo, memory } from "@/lib/eazo-shim";
import { getTask, toggleSubtask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { TaskDetailContent } from "@/components/task/task-detail-content";

interface TaskDetailPageProps {
  taskId: string;
}

export function TaskDetailPage({ taskId }: TaskDetailPageProps) {
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [task, setTask] = useState<TaskWithSubtasks | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completedCount = task?.subtasks.filter((s) => s.completed).length ?? 0;
  void completedCount; // 由 TaskDetailContent 内部计算，此处仅保留供未来扩展

  // 依赖 user?.id（稳定字符串）而非 user 对象：useEazo 每次渲染重建 user 引用，
  // 直接依赖 user 会让 effect 在每次渲染后重跑，形成无限拉取循环（频闪 + 误报网络异常）。
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getTask(taskId)
      .then((data) => { if (!cancelled) { setFetching(false); setTask(data); } })
      .catch((e) => { if (!cancelled) { setFetching(false); setError(e.message); } });
    return () => { cancelled = true; };
  }, [taskId, user?.id]);

  const handleToggle = useCallback(
    async (subtaskId: string, current: boolean) => {
      if (!task) return;
      const next = !current;
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: prev.subtasks.map((s) =>
                s.id === subtaskId ? { ...s, completed: next } : s
              ),
            }
          : prev
      );
      await toggleSubtask(taskId, subtaskId, next).catch(() => {});
      memory
        .reportAction({
          content: `User ${next ? "completed" : "uncompleted"} subtask in task "${task.title}"`,
          event_type: next ? "complete" : "update",
        })
        .catch(() => {});
    },
    [task, taskId]
  );

  if (loading || fetching) {
    return <PageShell><LoadingState /></PageShell>;
  }

  if (error || !task) {
    return (
      <PageShell>
        <p className="text-[14px]" style={{ color: "#777B75" }}>任务未找到</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TaskDetailContent task={task} onToggle={handleToggle} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative z-10"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        minHeight: "100vh",
      }}
    >
      <div className="mx-auto px-4" style={{ width: "min(100% - 32px, 760px)" }}>
        <nav
          className="flex items-center justify-between"
          style={{ height: 64, fontSize: 14, color: "#777B75" }}
        >
          <Link
            href="/history"
            className="font-[650] tracking-[-0.03em] hover:opacity-70 transition-opacity"
            style={{ color: "#111111" }}
          >
            ← 历史任务
          </Link>
          <span
            className="text-[12px] uppercase tracking-[0.06em]"
            style={{ color: "#777B75", fontFamily: "var(--font-geist-mono), monospace" }}
          >
            Task Detail
          </span>
        </nav>
        <div className="pt-4 pb-14">{children}</div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <p className="text-[14px] py-10" style={{ color: "#777B75" }}>
      加载中…
    </p>
  );
}
