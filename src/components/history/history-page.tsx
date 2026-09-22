"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { auth, useEazo } from "@/lib/eazo-shim";
import { getTasks, deleteTask } from "@/lib/api/tasks";
import type { TaskWithProgress } from "@/lib/api/tasks";
import { DeletePlanModal } from "@/components/home/delete-plan-modal";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { BrandBackLink } from "@/components/task/brand-back-link";
import { BrandPageShell } from "@/components/task/brand-page-shell";
import { DetailNotice } from "@/components/task/detail-notice";
import { HistoryRow } from "./history-row";

/**
 * 历史任务页：品牌外壳 + `.main__head` 页头 + 白卡 `.subs` 列表。
 * 数据、删除二次确认与 `user?.id` 依赖键均沿用改造前的行为。
 */
export function HistoryPage() {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  // fetching 初始 false，等用户已登录再置 true，避免闪烁
  const [fetching, setFetching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TaskWithProgress | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 依赖 user?.id（稳定字符串）而非 user 对象：useEazo 每次渲染重建 user 引用，
  // 直接依赖 user 会导致 effect 在每次渲染后重跑，形成无限拉取循环（频闪 + 误报网络异常）。
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      setFetching(true);
      try {
        const data = await getTasks();
        if (!cancelled) { setFetching(false); setTasks(data); }
      } catch {
        if (!cancelled) setFetching(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId]);

  const handleDeleteClick = (task: TaskWithProgress, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteTarget(task);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      setTasks((prev) => prev.filter((task) => task.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  };

  const doneCount = tasks.filter((task) => task.status === "done").length;

  return (
    <BrandPageShell maxWidth={1024} railLabel="Today" railHref="/app">
      <BrandBackLink href="/app">返回今日面板</BrandBackLink>

      <header className="mb-3.5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Eyebrow>History</Eyebrow>
          <Heading level={2} spec="page" accentDot className="mt-2 [&>span]:ml-[.06em] [&>span]:size-[.28em]">
            {t("history.recentTasks", "历史任务")}
          </Heading>
          <Mono className="mt-1.5 block text-text-3">
            {tasks.length > 0
              ? `${tasks.length} 个任务 · ${doneCount} 已完成 · ${tasks.length - doneCount} 进行中或未开始`
              : "每个访客的任务都按账号隔离存放"}
          </Mono>
        </div>
        <div className="flex flex-none items-center gap-2.5">
          <Link href="/app" className={buttonVariants({ variant: "default", size: "sm" })}>
            <Sparkles size={14} />
            新建规划
          </Link>
        </div>
      </header>

      {loading || fetching ? (
        <DetailNotice title={t("history.loading", "加载中…")} text="正在读取任务列表" />
      ) : !user ? (
        <DetailNotice
          title={t("history.signInPrompt", "登录后可查看历史任务")}
          ctaLabel={t("history.signIn", "登录")}
          onCta={() => auth.login().catch(() => {})}
        />
      ) : tasks.length === 0 ? (
        <DetailNotice
          title={t("history.empty", "还没有任务记录，回首页创建第一个吧 →")}
          text="回到今日面板输入一个目标，AI 会把它拆成带排期的子任务"
        />
      ) : (
        <Card className="gap-0">
          <CardHeader className="mb-1">
            <CardTitle>全部任务</CardTitle>
            <CardAction>
              <Mono className="text-[10px] text-text-3">点击行进入任务详情</Mono>
            </CardAction>
          </CardHeader>
          <ul className="flex flex-col">
            {tasks.map((task) => (
              <HistoryRow
                key={task.id}
                task={task}
                onDelete={(e) => handleDeleteClick(task, e)}
              />
            ))}
          </ul>
        </Card>
      )}

      {/* 统一删除计划安全二次确认弹窗 */}
      <DeletePlanModal
        isOpen={Boolean(deleteTarget)}
        taskTitle={deleteTarget?.title ?? ""}
        subtaskCount={deleteTarget?.subtaskCount}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </BrandPageShell>
  );
}
