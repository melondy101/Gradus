"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useEazo } from "@/lib/eazo-shim";
import { auth } from "@/lib/eazo-shim";
import { getTasks, deleteTask } from "@/lib/api/tasks";
import type { TaskWithProgress } from "@/lib/api/tasks";
import { T } from "@/lib/design-tokens";

export function HistoryPage() {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [tasks, setTasks] = useState<TaskWithProgress[]>([]);
  // fetching 初始 false，等用户已登录再置 true，避免闪烁
  const [fetching, setFetching] = useState(false);

  // 依赖 user?.id（稳定字符串）而非 user 对象：useEazo 每次渲染重建 user 引用，
  // 直接依赖 user 会导致 effect 在每次渲染后重跑，形成无限拉取循环（频闪 + 误报网络异常）。
  useEffect(() => {
    if (!user) return;
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
  }, [user?.id]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await deleteTask(id).catch(() => {});
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <PageShell>
      {loading || fetching ? (
        <LoadingState />
      ) : !user ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <p className="text-[14px]" style={{ color: T.muted }}>
            {t("history.signInPrompt", "登录后可查看历史任务")}
          </p>
          <button
            onClick={() => auth.login().catch(() => {})}
            className="px-6 py-[10px] rounded-full text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
            style={{ background: T.ink }}
          >
            {t("history.signIn", "登录")}
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-[14px]" style={{ color: T.muted }}>
          {t("history.empty", "还没有任务记录，回首页创建第一个吧 →")}
        </p>
      ) : (
        <>
          <h2
            className="text-[28px] font-semibold tracking-[-0.05em] mb-5"
            style={{ color: T.ink }}
          >
            {t("history.recentTasks", "最近任务")}
          </h2>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {tasks.map((task) => {
              const pct =
                task.subtaskCount > 0
                  ? Math.round((task.completedCount / task.subtaskCount) * 100)
                  : 0;

              return (
                <Link key={task.id} href={`/task/${task.id}`} className="block group">
                  <article
                    className="rounded-[18px] p-[18px] border transition-all hover:shadow-md"
                    style={{ background: T.surface, borderColor: T.line }}
                  >
                    <b className="block text-[15px] font-semibold leading-snug truncate" style={{ color: T.ink }}>
                      {task.title}
                    </b>

                    {/* 进度条 */}
                    {task.subtaskCount > 0 && (
                      <div className="mt-3 mb-1">
                        <div
                          className="h-[3px] rounded-full overflow-hidden"
                          style={{ background: T.soft }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: pct === 100 ? T.green : T.accent,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-[12px]"
                        style={{
                          fontFamily: "var(--font-geist-mono), monospace",
                          color: T.muted,
                        }}
                      >
                        {task.subtaskCount > 0
                          ? t("history.completed", { done: task.completedCount, total: task.subtaskCount })
                          : task.totalDays > 0
                          ? t("history.days", { count: task.totalDays })
                          : "—"}{" "}
                        · {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => handleDelete(task.id, e)}
                        className="text-[13px] opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                        style={{ color: T.muted }}
                        title={t("history.delete", "删除")}
                      >
                        ×
                      </button>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const brandTitle = `← ${t("brand.name", "拾级")}`;

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
          style={{ height: 64, fontSize: 14, color: T.muted }}
        >
          <Link
            href="/"
            className="font-[650] tracking-[-0.03em] hover:opacity-70 transition-opacity"
            style={{ color: T.ink }}
          >
            {brandTitle}
          </Link>
          <span
            className="text-[12px] tracking-[0.06em] uppercase"
            style={{
              color: T.muted,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            History
          </span>
        </nav>
        <div className="pt-4 pb-14">{children}</div>
      </div>
    </div>
  );
}

function LoadingState() {
  const { t } = useTranslation();
  return (
    <p className="text-[14px] py-10" style={{ color: T.muted }}>
      {t("history.loading", "加载中…")}
    </p>
  );
}
