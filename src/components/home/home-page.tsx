"use client";

import { useState } from "react";
import { useSessionUser } from "@/lib/auth-shim";
import {
  useSubtaskRowById,
  useSubtaskRows,
  useTaskList,
} from "@/features/tasks/use-tasks";
import { IconRail, type NavView } from "@/components/layout/icon-rail";
import { useAnalysisPanel } from "./right-panel";
import { HomeOverlaysStack } from "./home-overlays";
import { HomeWorkspace } from "./home-workspace";
import { useToast } from "./use-toast";
import { useUserStats } from "./use-user-stats";
import { useResponsive } from "./use-responsive";
import { useSubtaskActions } from "./use-subtask-actions";
import { useHomeData } from "./use-home-data";
import { useHomeFilters } from "./use-home-filters";
import { useHomeOverlays } from "./use-home-overlays";
import { useHomeHotkeys } from "./use-home-hotkeys";
import { useHomeTaskToggle } from "./use-home-task-toggle";

/**
 * 首页编排层（审计 §5.4：HomeScreen 只编排，零 fetch、零业务派生）：
 * 数据 = useHomeData + tasks store；派生 = useHomeFilters；
 * 弹层 = useHomeOverlays + HomeOverlaysStack；快捷键 = useHomeHotkeys；
 * 打卡 = useHomeTaskToggle（统一 mutation）；改期/跳过/删除 = useSubtaskActions；
 * 布局 = HomeWorkspace（中央列 + 右栏）与 IconRail。
 */
export function HomePage({ initialView = "today" }: { initialView?: NavView }) {
  const user = useSessionUser((s) => s.auth.user);
  const [currentView, setCurrentView] = useState<NavView>(initialView);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tasksList = useTaskList();
  const subtaskRows = useSubtaskRows();

  const panel = useAnalysisPanel();
  const { showToast } = useToast();
  const subtaskActions = useSubtaskActions({
    removeEntry: panel.removeEntry,
    showToast,
  });
  const overlays = useHomeOverlays(user, tasksList);
  const detailSubtask = useSubtaskRowById(overlays.detailSubtaskId);

  const data = useHomeData({
    userId: user?.id ?? null,
    entries: panel.entries,
    hydrateFromDB: panel.hydrateFromDB,
    onLoggedOut: () => overlays.setDetailSubtaskId(null),
  });
  const filters = useHomeFilters(subtaskRows, tasksList);
  const handleToggleSubtask = useHomeTaskToggle({
    notify: showToast,
    patchPanel: panel.patchSubtaskCompleted,
    setCongrats: overlays.setCongrats,
    setMilestone: overlays.setMilestone,
  });

  const { isTablet } = useResponsive();
  const stats = useUserStats();

  useHomeHotkeys({
    overlays,
    detailSubtask,
    focusedId: panel.focusedId,
    setFocusedId: panel.setFocusedId,
    displayedFlatRows: filters.displayedFlatRows,
    subtaskRows,
    handleToggleSubtask,
  });

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
      <IconRail
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
        todayPendingCount={filters.todayPendingCount}
        totalPlansCount={tasksList.length}
        onOpenCommandPalette={() => overlays.setCommandPaletteOpen(true)}
        onNewPlan={() => overlays.setShowInput(true)}
      />

      <HomeWorkspace
        currentView={currentView}
        data={data}
        filters={filters}
        overlays={overlays}
        panel={panel}
        subtaskActions={subtaskActions}
        stats={stats}
        narrow={isTablet}
        showLevelBadge={!!user && subtaskRows.length > 0}
        onToggleSubtask={handleToggleSubtask}
      />

      <HomeOverlaysStack
        overlays={overlays}
        subtaskActions={subtaskActions}
        panel={panel}
        detailSubtask={detailSubtask}
        subtaskRows={subtaskRows}
        onToggleSubtask={handleToggleSubtask}
        onSwitchView={setCurrentView}
      />
    </div>
  );
}
