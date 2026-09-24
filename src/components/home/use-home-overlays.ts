"use client";

import { useCallback, useRef, useState } from "react";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { CongratsData } from "./congrats-modal";
import type { ShareData } from "@/components/share/share-card-modal";
import type { Level } from "@/lib/growth";

interface OverlayUser {
  name?: string | null;
  avatarUrl?: string | null;
}

/**
 * 首页弹层与瞬态 UI 状态（审计 §5.4：弹窗入 use-overlays）。
 * 只持展示态与分享卡构造，不碰数据 store。
 */
export function useHomeOverlays(
  user: OverlayUser | null | undefined,
  tasksList: TaskWithSubtasks[]
) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [detailSubtaskId, setDetailSubtaskId] = useState<string | null>(null);
  const [activeSubtaskId, setActiveSubtaskId] = useState<string | null>(null);
  const [congrats, setCongrats] = useState<CongratsData | null>(null);
  const [milestone, setMilestone] = useState<Level | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [ritualMinimized, setRitualMinimized] = useState(false);
  const [highlightedSubtaskId, setHighlightedSubtaskId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 点击子任务 → 跳到对应日期卡片并高亮 3s（#subtask-card-{id}） */
  const handleJumpToSubtask = useCallback((subtaskId: string) => {
    setHighlightedSubtaskId(subtaskId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedSubtaskId(null), 3000);
    setTimeout(() => {
      const el = document.getElementById(`subtask-card-${subtaskId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }, []);

  const handleOpenWeeklyReport = useCallback(
    (stats: {
      streak: number;
      todayCount: number;
      weekCount: number;
      totalCompleted: number;
      activeTaskCount: number;
    }) => {
      // 深度专注/Bloom 只用子任务上真实持久化的字段；没有就传 undefined 让卡片隐藏
      const allSubs = tasksList.flatMap((tk) => tk.subtasks ?? []);
      const realHours = allSubs.reduce((sum, s) => sum + (s.deepWorkHours ?? 0), 0);
      setShareData({
        type: "report",
        userName: user?.name || "自主学习者",
        userAvatar: user?.avatarUrl ?? undefined,
        stats,
        subtasks: allSubs,
        streakDays: stats.streak || 0,
        completedSubtasksCount: stats.todayCount || 0,
        totalSubtasksCount: stats.totalCompleted || 0,
        deepWorkHours: realHours > 0 ? realHours : undefined,
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
      const realHours = data.subtasks.reduce((sum, s) => sum + (s.deepWorkHours ?? 0), 0);
      setShareData({
        type: "certificate",
        userName: user?.name || "自主学习者",
        userAvatar: user?.avatarUrl ?? undefined,
        taskTitle: data.taskTitle,
        subtasks: data.subtasks,
        totalDays: data.subtasks.reduce((sum, s) => sum + s.durationDays, 0),
        completedSubtasksCount: data.subtasks.length,
        totalSubtasksCount: data.subtasks.length,
        deepWorkHours: realHours > 0 ? realHours : undefined,
        quote: "已圆满完成全部进阶阶梯，认知能力迈入全新境界！",
      });
    },
    [user]
  );

  return {
    commandPaletteOpen,
    setCommandPaletteOpen,
    showInput,
    setShowInput,
    detailSubtaskId,
    setDetailSubtaskId,
    activeSubtaskId,
    setActiveSubtaskId,
    congrats,
    setCongrats,
    milestone,
    setMilestone,
    shareData,
    setShareData,
    ritualMinimized,
    setRitualMinimized,
    highlightedSubtaskId,
    handleJumpToSubtask,
    handleOpenWeeklyReport,
    handleGenerateCertificate,
  };
}

export type HomeOverlays = ReturnType<typeof useHomeOverlays>;
