"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/eazo-shim";
import {
  getSubtasksWithTask,
  getTasksWithSubtasks,
  toggleSubtask,
  updateTaskStatusApi,
} from "@/lib/api/tasks";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { TodayView } from "./today-view";
import { computeTodayMetrics } from "./today-metrics";
import { useUserStats } from "./use-user-stats";
import { useResponsive } from "./use-responsive";
import { RightPanel, useAnalysisPanel } from "./right-panel";
import { AppHeader } from "./app-header";
import { NewTaskInput } from "./new-task-input";
import { SubtaskDetailModal } from "./subtask-detail-modal";
import { CongratulationsModal, type CongratsData } from "./congrats-modal";
import { request } from "@/lib/api/request";
import { encourageMessage, crossedMilestone, type Level } from "@/lib/growth";
import { MilestoneUnlockModal } from "./milestone-unlock-modal";
import { startOfToday, buildTimelineSections } from "./timeline-sections";
import { IconRail } from "@/components/layout/icon-rail";
import type { NavView } from "@/components/layout/icon-rail";
import { AscendingStepsView } from "./ascending-steps-view";
import { AllPlansView } from "./all-plans-view";
import { TimelineView } from "./timeline-view";
import { CommandPalette } from "./command-palette";
import { ShareCardModal, type ShareData } from "@/components/share/share-card-modal";
import { AiGenerationRitualModal } from "@/components/task/ai-generation-ritual-modal";
import { OnboardingTour } from "./onboarding-tour";
import { DeletePlanModal } from "./delete-plan-modal";
import { KbdFooter } from "./kbd-footer";
import { HomeToast } from "./home-toast";
import { PostponeDialog } from "./postpone-dialog";
import { useToast } from "./use-toast";
import { useSubtaskActions } from "./use-subtask-actions";

export function HomePage({ initialView = "today" }: { initialView?: NavView }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useEazo((s) => s.auth.user);
  const authLoading = useEazo((s) => s.auth.loading);

  // 核心状态
  const [currentView, setCurrentView] = useState<NavView>(initialView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [subtaskRows, setSubtaskRows] = useState<SubtaskWithTask[]>([]);
  const [tasksList, setTasksList] = useState<TaskWithSubtasks[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [detailSubtask, setDetailSubtask] = useState<SubtaskWithTask | null>(null);
  const [congrats, setCongrats] = useState<CongratsData | null>(null);
  const [highlightedSubtaskId, setHighlightedSubtaskId] = useState<string | null>(null);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [streakTick, setStreakTick] = useState(0);
  const prevUserIdRef = useRef<string | null>(user?.id ?? null);
  const { toast, showToast, dismissToast } = useToast();
  const [milestone, setMilestone] = useState<Level | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [ritualMinimized, setRitualMinimized] = useState(false);
  const prevTotalRef = useRef<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 今日聚焦任务展示过滤状态（仅未完成 vs 全部）
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  // 标签过滤状态 (null 表示不过滤展示全部，string 表示当前激活的过滤标签)
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gradus_today_filter_pending");
      if (saved === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowOnlyPending(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggleFilterPending = useCallback((onlyPending: boolean) => {
    setShowOnlyPending(onlyPending);
    try {
      localStorage.setItem("gradus_today_filter_pending", String(onlyPending));
    } catch {
      /* ignore */
    }
  }, []);

  const handleOpenWeeklyReport = useCallback(
    (stats: { streak: number; todayCount: number; weekCount: number; totalCompleted: number; activeTaskCount: number }) => {
      setShareData({
        type: "report",
        userName: user?.name || "自主学习者",
        userAvatar: user?.avatarUrl ?? undefined,
        streakDays: stats.streak || 0,
        completedSubtasksCount: stats.todayCount || 0,
        totalSubtasksCount: stats.totalCompleted || 0,
        deepWorkHours: Math.round((stats.totalCompleted || 0) * 1.5),
        bloomDominantLevel: "L4 分析与应用",
        recentTasks: tasksList.slice(0, 3).map((t) => ({
          title: t.title,
          completedCount: t.subtasks.filter((s) => s.completed).length,
          totalCount: t.subtasks.length,
        })),
        quote: "日拱一卒，不期速成；循级而上，登高自博。",
      });
    },
    [user, tasksList]
  );

  const handleGenerateCertificate = useCallback(
    (data: CongratsData) => {
      setShareData({
        type: "certificate",
        userName: user?.name || "自主学习者",
        userAvatar: user?.avatarUrl ?? undefined,
        taskTitle: data.taskTitle,
        totalDays: data.subtasks.reduce((sum, s) => sum + s.durationDays, 0),
        completedSubtasksCount: data.subtasks.length,
        totalSubtasksCount: data.subtasks.length,
        deepWorkHours: Math.round(
          data.subtasks.reduce((sum, s) => sum + s.durationDays, 0) * 1.8
        ),
        bloomDominantLevel: data.subtasks[data.subtasks.length - 1]?.topic || "L5 综合与评估",
        streakDays: 7,
        keySubtasks: data.subtasks.map((s) => s.title),
        quote: "已圆满完成全部进阶阶梯，认知能力迈入全新境界！",
      });
    },
    [user]
  );

  const {
    entries,
    focusedId,
    setFocusedId,
    startAnalysis,
    regenAnalysis,
    removeEntry,
    hydrateFromDB,
    focusTask,
    patchSubtaskCompleted,
  } = useAnalysisPanel();

  // 改期 / 跳过 / 删除的编排连同三个待确认状态一起住在 useSubtaskActions 里
  const {
    postponeTarget,
    setPostponeTarget,
    deleteTarget,
    setDeleteTarget,
    isDeletingTask,
    confirmPostpone,
    handleSkip,
    handleRequestDelete,
    handleConfirmDelete,
  } = useSubtaskActions({
    tasksList,
    subtaskRows,
    setTasksList,
    setSubtaskRows,
    removeEntry,
    showToast,
  });

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
      !prevId && user
        ? "LOGIN"
        : prevId && !user
        ? "LOGOUT"
        : prevId && user
        ? "CHANGE"
        : "LOGOUT";

    if (mode === "LOGOUT") {
      setSubtaskRows([]);
      setTasksList([]);
      return;
    }
    loadSubtasks();
  }, [user?.id, loadSubtasks]);

  useEffect(() => {
    prevUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const refreshSubtasksIfIdle = useCallback(async () => {
    if (fetching) return;
    loadSubtasks();
  }, [fetching, loadSubtasks]);

  // Refresh when analysis finishes
  useEffect(() => {
    const done = entries.some((e) => e.stream.phase === "done");
    if (done && user) {
      const timer = setTimeout(() => {
        void refreshSubtasksIfIdle();
      }, 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map((e) => e.stream.phase).join(","), user?.id]);

  const prevHydratedUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (prevHydratedUserRef.current === user.id) return;
    prevHydratedUserRef.current = user.id;
    getTasksWithSubtasks()
      .then((tasks) => hydrateFromDB(tasks))
      .catch(() => {});
  }, [user?.id, hydrateFromDB]);

  // Handle task completion
  const handleToggleSubtask = useCallback(
    async (taskId: string, subtaskId: string, current: boolean, silent = false) => {
      const next = !current;
      setSubtaskRows((prev) =>
        prev.map((s) => (s.id === subtaskId ? { ...s, completed: next } : s))
      );
      setTasksList((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subtasks: (t.subtasks || []).map((s) =>
                  s.id === subtaskId ? { ...s, completed: next } : s
                ),
              }
            : t
        )
      );
      setDetailSubtask((prev) => (prev?.id === subtaskId ? { ...prev, completed: next } : prev));
      patchSubtaskCompleted(taskId, subtaskId, next);

      try {
        await toggleSubtask(taskId, subtaskId, next);
      } catch {
        // Rollback
        setSubtaskRows((prev) =>
          prev.map((s) => (s.id === subtaskId ? { ...s, completed: current } : s))
        );
        setTasksList((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks || []).map((s) =>
                    s.id === subtaskId ? { ...s, completed: current } : s
                  ),
                }
              : t
          )
        );
        setDetailSubtask((prev) =>
          prev?.id === subtaskId ? { ...prev, completed: current } : prev
        );
        patchSubtaskCompleted(taskId, subtaskId, current);
        showToast(next ? t("home.toast.markDoneFailed") : t("home.toast.markUndoneFailed"));
        return;
      }

      if (next) setStreakTick((n) => n + 1);

      let allDone = false;
      setSubtaskRows((prev) => {
        const rows = prev.filter((s) => s.taskId === taskId);
        allDone =
          next && rows.length > 0 && rows.every((s) => (s.id === subtaskId ? next : s.completed));
        if (allDone) {
          updateTaskStatusApi(taskId, "done").catch(() => {});
          const taskTitle = rows[0]?.taskTitle ?? "";
          setCongrats({
            taskId,
            taskTitle,
            subtasks: rows.map((s) => (s.id === subtaskId ? { ...s, completed: true } : s)),
          });
          return prev.map((s) => (s.taskId === taskId ? { ...s, taskStatus: "done" } : s));
        }
        return prev;
      });

      if (next && !silent && !allDone) {
        try {
          const res = await request("/api/user/stats");
          if (res.ok) {
            const s = (await res.json()) as { todayCount: number; totalCompleted: number };
            const after = s.totalCompleted;
            const before = after - 1;
            prevTotalRef.current = after;
            const crossed = crossedMilestone(before, after);
            if (crossed) {
              setMilestone(crossed);
            } else {
              showToast(encourageMessage(s.todayCount, after));
            }
          }
        } catch {}
      }
    },
    [showToast, patchSubtaskCompleted, t]
  );

  const handleJumpToSubtask = useCallback(
    (subtaskId: string) => {
      setHighlightedSubtaskId(subtaskId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightedSubtaskId(null), 3000);
      setTimeout(() => {
        const el = document.getElementById(`subtask-card-${subtaskId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    },
    []
  );

  // 时间轴分组
  const sections = buildTimelineSections(subtaskRows, t, i18n.language);
  const todayPendingCount = sections.find((s) => s.key === "today")?.rows.filter((r) => !r.completed).length ?? 0;

  // 计算当前用户所有任务中出现的标签及任务计数
  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasksList) {
      const tags = parseTaskTags(t.tags);
      for (const tag of tags) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasksList]);

  // 根据“仅展示未完成任务”与“标签筛选”过滤后的展示分组
  const displayedSections = useMemo(() => {
    return sections.map((sec) => ({
      ...sec,
      rows: sec.rows.filter((r) => {
        if (showOnlyPending && r.completed) return false;
        if (selectedTag) {
          const rTags = parseTaskTags(r.taskTags);
          if (!rTags.includes(selectedTag)) return false;
        }
        return true;
      }),
    }));
  }, [sections, showOnlyPending, selectedTag]);

  const displayedFlatRows = useMemo(() => {
    return displayedSections.flatMap((s) => s.rows);
  }, [displayedSections]);

  const displayedTasksList = useMemo(() => {
    if (!selectedTag) return tasksList;
    return tasksList.filter((t) => parseTaskTags(t.tags).includes(selectedTag));
  }, [tasksList, selectedTag]);

  const displayedSubtaskRows = useMemo(() => {
    if (!selectedTag) return subtaskRows;
    return subtaskRows.filter((r) => parseTaskTags(r.taskTags).includes(selectedTag));
  }, [subtaskRows, selectedTag]);

  // ── 屏一数据分发：/api/user/stats 单点读取，今日分组只派生自 buildTimelineSections
  const { isTablet } = useResponsive();
  const stats = useUserStats(streakTick);
  const todaySection =
    displayedSections.find((sec) => sec.key === "today") ?? {
      key: "today" as const,
      label: "今日",
      sublabel: "",
      accentColor: "var(--accent, #F5C518)",
      rows: [] as SubtaskWithTask[],
    };
  const laterSections = displayedSections.filter((sec) => sec.key !== "today");
  const todayMetrics = useMemo(
    () => computeTodayMetrics(todaySection.rows, subtaskRows, startOfToday()),
    [todaySection.rows, subtaskRows]
  );

  // 键盘快捷键监听
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "n" || e.key === "N") {
        if (!showInput && !detailSubtask && !congrats && !commandPaletteOpen) {
          e.preventDefault();
          setShowInput(true);
        }
      } else if (e.key === "Escape") {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (detailSubtask) {
          setDetailSubtask(null);
        } else if (showInput) {
          setShowInput(false);
        } else if (activeSubtaskId) {
          setActiveSubtaskId(null);
        } else if (focusedId) {
          setFocusedId(null);
        }
      } else if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        !showInput &&
        !detailSubtask &&
        !congrats &&
        !commandPaletteOpen
      ) {
        if (displayedFlatRows.length === 0) return;
        e.preventDefault();
        const idx = displayedFlatRows.findIndex((r) => r.id === activeSubtaskId);
        let next: number;
        if (idx === -1) {
          next = e.key === "ArrowDown" ? 0 : displayedFlatRows.length - 1;
        } else {
          next =
            e.key === "ArrowDown"
              ? Math.min(displayedFlatRows.length - 1, idx + 1)
              : Math.max(0, idx - 1);
        }
        const target = displayedFlatRows[next];
        if (target) {
          setActiveSubtaskId(target.id);
          setFocusedId(target.taskId);
          setTimeout(() => {
            document
              .getElementById(`subtask-card-${target.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 0);
        }
      } else if (e.key === " ") {
        let target = activeSubtaskId ? subtaskRows.find((s) => s.id === activeSubtaskId) : undefined;
        if (!target && focusedId) {
          target = subtaskRows.find((s) => s.taskId === focusedId && !s.completed);
        }
        if (target) {
          e.preventDefault();
          handleToggleSubtask(target.taskId, target.id, target.completed);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showInput,
    detailSubtask,
    congrats,
    focusedId,
    activeSubtaskId,
    displayedFlatRows,
    subtaskRows,
    handleToggleSubtask,
    setFocusedId,
    commandPaletteOpen,
  ]);

  return (
    <div
      data-slot="page-canvas"
      style={{
        background: "var(--background)",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        fontFamily: "var(--sans)",
        overflow: "hidden",
      }}
    >
      {/* ── 1. 左侧折叠侧边栏 (Icon Rail / Sidebar Navigation) ── */}
      <IconRail
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        todayPendingCount={todayPendingCount}
        totalPlansCount={tasksList.length}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onNewPlan={() => setShowInput(true)}
        availableTags={availableTags}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />

      {/* ── 2. 中央主视图与顶栏 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
        {/* 顶栏：品牌 / 当前视图 / 标签过滤 / 等级徽章 */}
        <AppHeader
          currentView={currentView}
          selectedTag={selectedTag}
          onClearTag={() => setSelectedTag(null)}
          onOpenPalette={() => setCommandPaletteOpen(true)}
          showLevelBadge={!!user && subtaskRows.length > 0}
          streakTick={streakTick}
        />


        {/* 核心工作区 */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* 主视图内容区域 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            {/* VIEW 1: 今日聚焦 (Today) */}
            {currentView === "today" && (
              <TodayView
                authLoading={authLoading}
                fetching={fetching}
                loadError={loadError}
                onRetry={() => loadSubtasks()}
                stats={stats}
                metrics={todayMetrics}
                narrow={isTablet}
                todaySection={todaySection}
                laterSections={laterSections}
                totalRowCount={displayedFlatRows.length}
                showOnlyPending={showOnlyPending}
                selectedTag={selectedTag}
                onToggleFilterPending={handleToggleFilterPending}
                onClearTag={() => setSelectedTag(null)}
                onOpen={(row) => setDetailSubtask(row)}
                onSelect={(row) => {
                  setActiveSubtaskId(row.id);
                  setFocusedId(row.taskId);
                  focusTask(row.taskId);
                }}
                onToggle={(row, e) => {
                  e.stopPropagation();
                  handleToggleSubtask(row.taskId, row.id, row.completed);
                }}
                onSkip={(row, e) => {
                  e.stopPropagation();
                  handleSkip(row);
                }}
                onPostpone={(row, e) => {
                  e.stopPropagation();
                  setPostponeTarget(row);
                }}
                activeSubtaskId={activeSubtaskId}
                focusedTaskId={focusedId}
                highlightedSubtaskId={highlightedSubtaskId}
                onOpenPalette={() => setCommandPaletteOpen(true)}
                onNewGoal={(goal) => startAnalysis(goal)}
                onOpenDialog={() => setShowInput(true)}
                onOpenReport={() => {
                  if (stats) handleOpenWeeklyReport(stats);
                }}
                aiPanel={<RightPanel variant="card" entries={entries} focusedId={focusedId} setFocusedId={setFocusedId} regenAnalysis={regenAnalysis} removeEntry={removeEntry} onRequestDelete={handleRequestDelete} onToggleSubtask={handleToggleSubtask} onJumpToSubtask={handleJumpToSubtask} />}
              />
            )}

            {/* VIEW 2: 所有计划 (All Plans) */}
            {currentView === "plans" && (
              <div
                className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
                style={{ flex: 1, overflowY: "auto" }}
              >
                <AllPlansView
                  tasks={displayedTasksList}
                  onSelectTask={(taskId) => {
                    setFocusedId(taskId);
                    focusTask(taskId);
                  }}
                  onNewPlan={() => setShowInput(true)}
                  onDeleteTask={(task) => handleRequestDelete(task.id, task.title, task.subtasks?.length)}
                />
              </div>
            )}

            {/* VIEW 3: 拾级天梯 (Ascending Steps) */}
            {currentView === "steps" && (
              <div
                className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
                style={{ flex: 1, overflowY: "auto" }}
              >
                <AscendingStepsView
                  subtasks={displayedSubtaskRows}
                  onToggleSubtask={(s) => handleToggleSubtask(s.taskId, s.id, s.completed)}
                  onSelectSubtask={(s) => setDetailSubtask(s)}
                />
              </div>
            )}

            {/* VIEW 4: 时间甘特图 (Timeline) */}
            {currentView === "timeline" && (
              <div
                className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
                style={{ flex: 1, overflowY: "auto" }}
              >
                <TimelineView
                  subtasks={displayedSubtaskRows}
                  onSelectSubtask={(s) => setDetailSubtask(s)}
                  onToggleSubtask={(s) => handleToggleSubtask(s.taskId, s.id, s.completed)}
                />
              </div>
            )}
          </div>

          {/* ── 3. 右侧上下文检查面板 (Right Context Inspector) ── */}
          <div id="panel-right-container" style={{ display: "flex", height: "100%" }}>
            <RightPanel
              entries={entries}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
              regenAnalysis={regenAnalysis}
              removeEntry={removeEntry}
              onRequestDelete={(taskId, title, count) => handleRequestDelete(taskId, title, count)}
              onToggleSubtask={handleToggleSubtask}
              onJumpToSubtask={handleJumpToSubtask}
            />
          </div>
        </div>

        <KbdFooter />
      </div>

      {/* ── 弹窗与控制台模块 ── */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        subtasks={subtaskRows}
        onSelectSubtask={(s) => setDetailSubtask(s)}
        onNewPlan={() => setShowInput(true)}
        onSwitchView={(v) => setCurrentView(v)}
      />

      {showInput && (
        <NewTaskInput
          onClose={() => setShowInput(false)}
          onSubmit={(goal) => {
            setRitualMinimized(false);
            startAnalysis(goal);
          }}
        />
      )}

      {detailSubtask && (
        <SubtaskDetailModal
          row={detailSubtask}
          onClose={() => setDetailSubtask(null)}
          onToggle={() =>
            handleToggleSubtask(
              detailSubtask.taskId,
              detailSubtask.id,
              detailSubtask.completed
            )
          }
          onOpenTask={() => {
            router.push(`/task/${detailSubtask.taskId}`);
            setDetailSubtask(null);
          }}
        />
      )}

      {congrats && (
        <CongratulationsModal
          data={congrats}
          onClose={() => setCongrats(null)}
          onLearnMore={(taskId) => {
            setFocusedId(taskId);
            focusTask(taskId);
            setCongrats(null);
          }}
          onGenerateCertificate={handleGenerateCertificate}
        />
      )}

      {/* 🏆 学习周报与结业证书分享卡弹窗 */}
      {shareData && (
        <ShareCardModal data={shareData} onClose={() => setShareData(null)} />
      )}

      {/* 🚀 AI 生成多阶段深度仪式感与流式进度弹窗 */}
      {(() => {
        const activeEntry = entries.find(
          (e) =>
            e.stream.phase !== "idle" &&
            e.stream.phase !== "done" &&
            e.stream.phase !== "error"
        );
        if (!activeEntry || ritualMinimized) return null;
        return (
          <AiGenerationRitualModal
            isOpen={true}
            goal={activeEntry.taskTitle || activeEntry.rawInput || "学习任务深度规划"}
            phase={activeEntry.stream.phase}
            elapsedSec={activeEntry.stream.deltaLen}
            onMinimize={() => setRitualMinimized(true)}
            onClose={() => setRitualMinimized(true)}
          />
        );
      })()}

      {milestone && (
        <MilestoneUnlockModal level={milestone} onClose={() => setMilestone(null)} />
      )}

      {postponeTarget && (
        <PostponeDialog
          row={postponeTarget}
          onCancel={() => setPostponeTarget(null)}
          onConfirm={confirmPostpone}
        />
      )}

      {/* 🗑 统一删除计划安全二次确认弹窗 (Delete Plan Confirmation Modal) */}
      <DeletePlanModal
        isOpen={Boolean(deleteTarget)}
        taskTitle={deleteTarget?.title ?? ""}
        subtaskCount={deleteTarget?.subtaskCount}
        isDeleting={isDeletingTask}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {toast && (
        <HomeToast
          toast={toast}
          onAction={() => {
            toast.onAction?.();
            dismissToast();
          }}
        />
      )}

      {/* 🧭 新用户 1-2-3 步气泡高亮引导 (Step-by-step Onboarding Tour) */}
      <OnboardingTour
        onStartExample={(goal) => {
          setRitualMinimized(false);
          startAnalysis(goal);
        }}
        onOpenNewTaskModal={() => setShowInput(true)}
      />
    </div>
  );
}
