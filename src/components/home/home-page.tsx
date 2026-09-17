"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { getResolvedLocale } from "@/i18n";
import { motion } from "framer-motion";
import { CheckCircle2, ListFilter, Tag as TagIcon, X, Search, Crown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/eazo-shim";
import {
  getSubtasksWithTask,
  getTasksWithSubtasks,
  toggleSubtask,
  updateTaskStatusApi,
  postponeSubtask,
  unpostponeSubtask,
  deleteTask,
} from "@/lib/api/tasks";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { AchievementPanel, LevelBadge } from "./achievement-panel";
import { RightPanel, useAnalysisPanel } from "./right-panel";
import { NewTaskInput } from "./new-task-input";
import { getSubtaskActualDates } from "./subtask-row";
import { TimelineCard, TimelineSectionHeader } from "./timeline-card";
import { SubtaskDetailModal } from "./subtask-detail-modal";
import { CongratulationsModal, type CongratsData } from "./congrats-modal";
import { request } from "@/lib/api/request";
import { encourageMessage, crossedMilestone, type Level } from "@/lib/growth";
import { MilestoneUnlockModal } from "./milestone-unlock-modal";
import { IconRail } from "@/components/layout/icon-rail";
import type { NavView } from "./sidebar-nav";
import { AscendingStepsView } from "./ascending-steps-view";
import { AllPlansView } from "./all-plans-view";
import { TimelineView } from "./timeline-view";
import { CommandPalette } from "./command-palette";
import { ShareCardModal, type ShareData } from "@/components/share/share-card-modal";
import { AiGenerationRitualModal } from "@/components/task/ai-generation-ritual-modal";
import { OnboardingTour, TourHelpButton } from "./onboarding-tour";
import { DeletePlanModal } from "./delete-plan-modal";
import { UserBadge } from "@/components/user-profile/user-badge";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { T } from "@/lib/design-tokens";

// 骨架屏组件
function ListSkeleton() {
  return (
    <div aria-hidden style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.soft, flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ width: `${70 - i * 8}%`, height: 12, borderRadius: 4, background: T.soft }} />
            <div style={{ width: "42%", height: 10, borderRadius: 4, background: T.soft }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type TimeFilter = "today" | "tomorrow" | "week" | "later" | "all";

interface TimelineSection {
  key: TimeFilter;
  label: string;
  sublabel: string;
  accentColor: string;
  rows: SubtaskWithTask[];
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const user = useEazo((s) => s.auth.user);
  const authLoading = useEazo((s) => s.auth.loading);

  // 核心状态
  const [currentView, setCurrentView] = useState<NavView>("today");
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
  const [postponeTarget, setPostponeTarget] = useState<SubtaskWithTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
    subtaskCount?: number;
  } | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [toast, setToast] = useState<{ msg: string; actionLabel?: string; onAction?: () => void } | null>(null);
  const [milestone, setMilestone] = useState<Level | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [ritualMinimized, setRitualMinimized] = useState(false);
  const prevTotalRef = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const showToast = useCallback((msg: string, actionLabel?: string, onAction?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, actionLabel, onAction });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

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

  const confirmPostpone = useCallback(
    async (row: SubtaskWithTask) => {
      setPostponeTarget(null);
      setSubtaskRows((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay + 1 } : s))
      );
      const newStartDay = await postponeSubtask(row.taskId, row.id).catch(() => null);
      if (newStartDay === null) {
        setSubtaskRows((prev) =>
          prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay - 1 } : s))
        );
        showToast(t("home.toast.postponeFailed"));
        return;
      }
      showToast(t("home.toast.postponed", { title: row.title }), t("home.toast.undo"), () => {
        setSubtaskRows((prev) =>
          prev.map((s) => (s.id === row.id ? { ...s, startDay: Math.max(0, s.startDay - 1) } : s))
        );
        unpostponeSubtask(row.taskId, row.id).catch(() => {
          setSubtaskRows((prev) =>
            prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay + 1 } : s))
          );
          showToast(t("home.toast.undoFailed"));
        });
      });
    },
    [showToast, t]
  );

  const handleSkip = useCallback(
    async (row: SubtaskWithTask) => {
      if (row.completed) return;
      // 跳过此任务：顺延排期至次日（不标记完成，不增加完成计数）
      setSubtaskRows((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay + 1 } : s))
      );
      const newStartDay = await postponeSubtask(row.taskId, row.id).catch(() => null);
      if (newStartDay === null) {
        setSubtaskRows((prev) =>
          prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay - 1 } : s))
        );
        showToast(t("home.toast.postponeFailed", "跳过失败，请重试"));
        return;
      }
      showToast(t("home.toast.skipped", { title: row.title }), t("home.toast.undo"), () => {
        setSubtaskRows((prev) =>
          prev.map((s) => (s.id === row.id ? { ...s, startDay: Math.max(0, s.startDay - 1) } : s))
        );
        unpostponeSubtask(row.taskId, row.id).catch(() => {
          setSubtaskRows((prev) =>
            prev.map((s) => (s.id === row.id ? { ...s, startDay: s.startDay + 1 } : s))
          );
          showToast(t("home.toast.undoFailed", "撤销失败，请重试"));
        });
      });
    },
    [showToast, t]
  );

  const handleRequestDelete = useCallback(
    (taskId: string, title?: string, subtaskCount?: number) => {
      const taskInList = tasksList.find((t) => t.id === taskId);
      const rowsInList = subtaskRows.filter((s) => s.taskId === taskId);
      const taskTitle = title || taskInList?.title || rowsInList[0]?.taskTitle || "未命名计划";
      const count = subtaskCount ?? taskInList?.subtasks?.length ?? rowsInList.length;
      setDeleteTarget({
        id: taskId,
        title: taskTitle,
        subtaskCount: count,
      });
    },
    [tasksList, subtaskRows]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeletingTask(true);
    try {
      await deleteTask(deleteTarget.id);
      setTasksList((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setSubtaskRows((prev) => prev.filter((s) => s.taskId !== deleteTarget.id));
      removeEntry(deleteTarget.id);
      showToast(`已删除计划「${deleteTarget.title}」`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "删除失败，请稍后再试");
    } finally {
      setIsDeletingTask(false);
    }
  }, [deleteTarget, removeEntry, showToast]);

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
  const totalPending = subtaskRows.filter((r) => !r.completed).length;
  const completedCount = subtaskRows.filter((r) => r.completed).length;
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

  const [todayStr, setTodayStr] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodayStr(
      new Date().toLocaleDateString(getResolvedLocale(), {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

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
      style={{
        background: "var(--background)",
        height: "100%",
        display: "flex",
        flexDirection: "row",
        fontFamily: "var(--font-dm-sans), DM Sans, system-ui, sans-serif",
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
        {/* 顶部标题栏与全局搜索 */}
        <header
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            padding: "0 14px",
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            boxShadow: "var(--shadow-sm)",
            gap: 8,
          }}
        >
          {/* 面包屑与视图切换指示 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
            <span
              className="truncate"
              style={{
                fontFamily: "var(--font-outfit), Outfit, sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              {currentView === "today" && "今日聚焦"}
              {currentView === "plans" && "全部计划"}
              {currentView === "steps" && "拾级天梯"}
              {currentView === "timeline" && "时间甘特图"}
            </span>

            {/* 标签过滤生效状态指示条 */}
            {selectedTag && (
              <div
                id="header-active-tag-filter"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--accent-soft)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <TagIcon size={11} />
                <span className="truncate max-w-[70px] sm:max-w-[120px]">{selectedTag}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  title="清除标签过滤"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            )}

            {user && subtaskRows.length > 0 && <LevelBadge refreshTick={streakTick} />}
          </div>

          {/* 桌面端：快捷搜索与新建 */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                color: "var(--muted-foreground)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <span>🔍 搜索或执行...</span>
              <kbd
                style={{
                  fontSize: 10,
                  background: "var(--card)",
                  padding: "1px 5px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
              >
                ⌘K
              </kbd>
            </button>

            <button
              id="btn-header-new-task"
              onClick={() => setShowInput(true)}
              style={{
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                boxShadow: "0 2px 8px var(--accent-glow)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 新学习目标
            </button>
          </div>

          {/* 移动端顶栏右侧快捷操作（搜索、通知、主题、会员、用户身份） */}
          <div className="flex sm:hidden items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="搜索"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Search size={18} />
            </button>
            <NotificationCenter />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => openMembershipModal("overview")}
              aria-label="会员中心"
              className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 transition-colors"
            >
              <Crown size={18} />
            </button>
            <UserBadge />
          </div>
        </header>

        {/* 核心工作区 */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* 主视图内容区域 */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            {/* VIEW 1: 今日聚焦 (Today) */}
            {currentView === "today" && (
              <div id="today-task-area" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {user && !fetching && subtaskRows.length > 0 && (
                  <AchievementPanel
                    refreshTick={streakTick}
                    pending={totalPending}
                    title="今日学习成就与专注进度"
                    onOpenShareModal={handleOpenWeeklyReport}
                  />
                )}

                <div className="canvas-scroll pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:pb-5 px-3 sm:px-5 pt-4" style={{ flex: 1, overflowY: "auto" }}>
                  {authLoading || fetching ? (
                    <ListSkeleton />
                  ) : loadError ? (
                    <div style={{ padding: "60px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                      <div style={{ fontSize: 40 }}>⚠️</div>
                      <div>
                        <div style={{ color: T.ink, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>数据加载遇到异常</div>
                        <div style={{ color: T.muted, fontSize: 13 }}>请检查网络或点击重新尝试</div>
                      </div>
                      <button
                        onClick={() => loadSubtasks()}
                        style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
                      >
                        重新加载
                      </button>
                    </div>
                  ) : subtaskRows.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        padding: "40px 24px",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 16,
                        maxWidth: 440,
                        margin: "24px auto",
                        background: T.surface,
                        border: `1px solid ${T.line}`,
                        borderRadius: 14,
                        boxShadow: "0 2px 14px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          background: "rgba(74,124,111,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                        }}
                      >
                        📖
                      </div>
                      <div>
                        <div className="font-editorial" style={{ color: T.ink, fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
                          开启你的第一个认知攀登计划
                        </div>
                        <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
                          输入一个宏大的学习目标，AI 将拆解为带认知梯度的子任务与权威学习资源
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
                        {[
                          { icon: "🐍", label: "Python 异步并发编程", value: "精通 Python 异步编程与 asyncio 实战" },
                          { icon: "⚛️", label: "React 19 全栈架构", value: "掌握 React 19 Server Components 与 Next.js App Router" },
                          { icon: "📐", label: "线性代数与机器学习", value: "掌握机器学习所需的线性代数核心概念与直觉" },
                        ].map((ex) => (
                          <button
                            key={ex.label}
                            onClick={() => startAnalysis(ex.value)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              background: T.soft,
                              border: `1px solid ${T.line}`,
                              borderRadius: 9,
                              padding: "10px 14px",
                              fontSize: 13,
                              color: T.ink,
                              fontWeight: 500,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = T.accent;
                              e.currentTarget.style.background = T.surface;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = T.line;
                              e.currentTarget.style.background = T.soft;
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{ex.icon}</span>
                            <span style={{ flex: 1, fontWeight: 600 }}>{ex.label}</span>
                            <span style={{ color: T.accent }}>→</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div>
                      {/* 今日聚焦顶栏控制区: 任务列表信息与过滤切换按钮 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 16,
                          paddingBottom: 10,
                          borderBottom: `1px solid ${T.line}`,
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-outfit), Outfit, sans-serif",
                              fontSize: 14,
                              fontWeight: 700,
                              color: T.ink,
                              letterSpacing: "-0.01em",
                            }}
                          >
                            任务排期列表
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: T.muted,
                            }}
                          >
                            {showOnlyPending
                              ? `仅待完成 · 待办 ${totalPending} 项`
                              : `全部任务 · 共 ${subtaskRows.length} 项（已完成 ${completedCount}）`}
                          </span>
                        </div>

                        {/* 切换按钮组 */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: T.soft,
                            padding: 3,
                            borderRadius: 8,
                            border: `1px solid ${T.line}`,
                          }}
                          role="group"
                          aria-label="任务展示模式切换"
                        >
                          <button
                            type="button"
                            id="btn-filter-all-tasks"
                            onClick={() => handleToggleFilterPending(false)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: !showOnlyPending ? 600 : 500,
                              border: "none",
                              cursor: "pointer",
                              background: !showOnlyPending ? T.surface : "transparent",
                              color: !showOnlyPending ? T.ink : T.muted,
                              boxShadow: !showOnlyPending ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              transition: "all 0.15s ease",
                            }}
                            title="展示所有任务（包含已完成与未完成）"
                          >
                            <ListFilter size={13} />
                            <span>展示所有任务</span>
                          </button>

                          <button
                            type="button"
                            id="btn-filter-pending-tasks"
                            onClick={() => handleToggleFilterPending(true)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 12px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: showOnlyPending ? 600 : 500,
                              border: "none",
                              cursor: "pointer",
                              background: showOnlyPending ? T.surface : "transparent",
                              color: showOnlyPending ? T.accent : T.muted,
                              boxShadow: showOnlyPending ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                              transition: "all 0.15s ease",
                            }}
                            title="仅展示未完成任务，减轻信息密度"
                          >
                            <CheckCircle2 size={13} />
                            <span>仅展示未完成任务</span>
                            {completedCount > 0 && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  padding: "1px 6px",
                                  borderRadius: 10,
                                  background: showOnlyPending ? T.accentSoft : "rgba(0,0,0,0.05)",
                                  color: showOnlyPending ? T.accent : T.muted,
                                  fontWeight: 600,
                                }}
                              >
                                隐藏 {completedCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </div>

                      {displayedSections.every((s) => s.rows.length === 0) ? (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            padding: "40px 24px",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 14,
                            maxWidth: 420,
                            margin: "28px auto",
                            background: T.surface,
                            border: `1px solid ${T.line}`,
                            borderRadius: 14,
                            boxShadow: "0 2px 14px rgba(0,0,0,0.02)",
                          }}
                        >
                          <div style={{ fontSize: 32 }}>{selectedTag ? "🏷️" : "🎉"}</div>
                          <div>
                            <div style={{ color: T.ink, fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                              {selectedTag
                                ? `暂无属于「${selectedTag}」的任务`
                                : "待完成任务已全部清空！"}
                            </div>
                            <div style={{ color: T.muted, fontSize: 13, lineHeight: 1.6 }}>
                              {selectedTag
                                ? "当前标签下未找到符合条件的任务，你可以清除筛选查看全部任务。"
                                : "当前已过滤隐藏全部已完成的任务。你可以切换查看所有任务，或开启新的学习目标。"}
                            </div>
                          </div>
                          {selectedTag ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTag(null)}
                              style={{
                                background: T.accent,
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "8px 20px",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px var(--accent-glow)",
                              }}
                            >
                              清除标签筛选 (共 {subtaskRows.length} 项)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleFilterPending(false)}
                              style={{
                                background: T.accent,
                                color: "#fff",
                                border: "none",
                                borderRadius: 8,
                                padding: "8px 20px",
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: "pointer",
                                boxShadow: "0 2px 8px var(--accent-glow)",
                              }}
                            >
                              展示所有任务 ({subtaskRows.length})
                            </button>
                          )}
                        </motion.div>
                      ) : (
                        displayedSections
                          .filter((s) => s.rows.length > 0)
                          .map((section) => (
                            <div key={section.key} style={{ marginBottom: 28 }}>
                              <TimelineSectionHeader
                                label={section.label}
                                sublabel={section.sublabel}
                                accentColor={section.accentColor}
                                pendingCount={section.rows.filter((r) => !r.completed).length}
                              />
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {section.rows.map((row) => (
                                  <div key={row.id} id={`subtask-card-${row.id}`}>
                                    <TimelineCard
                                      row={row}
                                      isSelected={focusedId === row.taskId}
                                      isActive={activeSubtaskId === row.id}
                                      isHighlighted={highlightedSubtaskId === row.id}
                                      onOpen={() => setDetailSubtask(row)}
                                      onSelect={() => {
                                        setActiveSubtaskId(row.id);
                                        setFocusedId(row.taskId);
                                        focusTask(row.taskId);
                                      }}
                                      onToggle={(e) => {
                                        e.stopPropagation();
                                        handleToggleSubtask(row.taskId, row.id, row.completed);
                                      }}
                                      onSkip={(e) => {
                                        e.stopPropagation();
                                        handleSkip(row);
                                      }}
                                      onPostpone={(e) => {
                                        e.stopPropagation();
                                        setPostponeTarget(row);
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW 2: 所有计划 (All Plans) */}
            {currentView === "plans" && (
              <div className="canvas-scroll" style={{ flex: 1, overflowY: "auto" }}>
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
              <div className="canvas-scroll" style={{ flex: 1, overflowY: "auto" }}>
                <AscendingStepsView
                  subtasks={displayedSubtaskRows}
                  onToggleSubtask={(s) => handleToggleSubtask(s.taskId, s.id, s.completed)}
                  onSelectSubtask={(s) => setDetailSubtask(s)}
                />
              </div>
            )}

            {/* VIEW 4: 时间甘特图 (Timeline) */}
            {currentView === "timeline" && (
              <div className="canvas-scroll" style={{ flex: 1, overflowY: "auto" }}>
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

        {/* 底部快捷键提示 (移动端隐藏以节省屏幕空间) */}
        <footer
          className="hidden sm:flex"
          style={{
            background: T.surface,
            borderTop: `1px solid ${T.line}`,
            padding: "8px 24px",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            fontSize: 12,
            color: T.muted,
          }}
        >
          <span>{todayStr}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <TourHelpButton />
            <span>
              <kbd style={{ background: T.soft, padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-geist-mono), monospace" }}>
                ⌘K
              </kbd>{" "}
              指令菜单
            </span>
            <span>
              <kbd style={{ background: T.soft, padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-geist-mono), monospace" }}>
                N
              </kbd>{" "}
              新建
            </span>
            <span>
              <kbd style={{ background: T.soft, padding: "1px 5px", borderRadius: 4, fontFamily: "var(--font-geist-mono), monospace" }}>
                Space
              </kbd>{" "}
              标记完成
            </span>
          </div>
        </footer>
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
        <>
          <div
            aria-hidden
            onClick={() => setPostponeTarget(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              zIndex: 300,
              backdropFilter: "blur(2px)",
            }}
          />
          <div
            role="dialog"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: T.surface,
              border: `1px solid ${T.line}`,
              borderRadius: 14,
              padding: "20px 24px",
              width: "min(380px, 90vw)",
              zIndex: 301,
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>⏭</span>
              <div>
                <div style={{ color: T.ink, fontWeight: 700, fontSize: 15 }}>延后执行任务</div>
                <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>将任务顺延至下一个可用时间槽</div>
              </div>
            </div>
            <div style={{ background: T.soft, borderRadius: 8, padding: "10px 12px", color: T.ink, fontSize: 13, lineHeight: 1.5 }}>
              确定将「{postponeTarget.title}」延后 1 天执行吗？系统将自动智能重排接续计划。
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => confirmPostpone(postponeTarget)}
                style={{ flex: 1, background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                确认顺延
              </button>
              <button
                onClick={() => setPostponeTarget(null)}
                style={{ background: T.soft, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 8, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}
              >
                取消
              </button>
            </div>
          </div>
        </>
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
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 60,
            transform: "translateX(-50%)",
            zIndex: 400,
            background: "rgba(26,26,26,0.92)",
            color: "#fff",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            maxWidth: "min(440px, 92vw)",
          }}
        >
          <span>{toast.msg}</span>
          {toast.actionLabel && toast.onAction && (
            <button
              onClick={() => {
                toast.onAction?.();
                setToast(null);
              }}
              style={{
                background: "transparent",
                color: "#7C8CF5",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
                padding: 0,
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
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

function buildTimelineSections(
  rows: SubtaskWithTask[],
  t: (key: string, opts?: Record<string, unknown>) => string,
  locale: string
): TimelineSection[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString(locale, { month: "long", day: "numeric", weekday: "short" });
  const fmtRange = (s: Date, e: Date) =>
    `${s.toLocaleDateString(locale, { month: "numeric", day: "numeric" })} — ${e.toLocaleDateString(
      locale,
      { month: "numeric", day: "numeric" }
    )}`;

  const buckets: Record<string, SubtaskWithTask[]> = {
    today: [],
    tomorrow: [],
    week: [],
    later: [],
  };

  for (const r of rows) {
    const dates = getSubtaskActualDates(r);
    if (!dates) {
      buckets.today.push(r);
      continue;
    }
    const { start, end } = dates;
    if (start <= today && today <= end) {
      buckets.today.push(r);
    } else if (start <= tomorrow && tomorrow <= end) {
      buckets.tomorrow.push(r);
    } else if (start <= weekEnd && end >= today) {
      buckets.week.push(r);
    } else {
      buckets.later.push(r);
    }
  }

  const sort = (arr: SubtaskWithTask[]) =>
    [...arr].sort((a, b) => a.sortOrder - b.sortOrder);

  return [
    {
      key: "today",
      label: t("home.timeline.today"),
      sublabel: fmtDate(today),
      accentColor: "#4A7C6F",
      rows: sort(buckets.today),
    },
    {
      key: "tomorrow",
      label: t("home.timeline.tomorrow"),
      sublabel: fmtDate(tomorrow),
      accentColor: "#C4841D",
      rows: sort(buckets.tomorrow),
    },
    {
      key: "week",
      label: t("home.timeline.week"),
      sublabel: fmtRange(new Date(today.getTime() + 2 * 86400000), weekEnd),
      accentColor: "#4B7BEC",
      rows: sort(buckets.week),
    },
    {
      key: "later",
      label: t("home.timeline.later"),
      sublabel: "7天后接续",
      accentColor: "#9CA3AF",
      rows: sort(buckets.later),
    },
  ];
}
