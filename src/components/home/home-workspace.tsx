"use client";

import type { NavView } from "@/components/layout/nav-items";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import type { UserStats } from "@/lib/api/user-stats";
import type { HomeFilters } from "./use-home-filters";
import type { HomeOverlays } from "./use-home-overlays";
import type { SubtaskActions } from "./use-subtask-actions";
import type { AnalysisPanel } from "./use-analysis-panel";
import { KbdFooter } from "./kbd-footer";
import { RightPanel } from "./right-panel";
import { HomeMainArea } from "./home-main-area";
import { PlanFilterBar } from "./plan-filter-bar";

export interface HomeWorkspaceProps {
  currentView: NavView;
  data: { fetching: boolean; loadError: boolean; loadSubtasks: () => void };
  filters: HomeFilters;
  overlays: HomeOverlays;
  panel: AnalysisPanel;
  subtaskActions: SubtaskActions;
  stats: UserStats | null;
  /** 全量子任务（未筛选），供右栏「本周路线」卡使用 */
  rows: SubtaskWithTask[];
  narrow: boolean;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  onViewPlan: (taskId: string, view: Extract<NavView, "steps" | "timeline">) => void;
}

/** 中央列：主视图/右栏工作区 + 键位脚注（#panel-right-container 为 audit:parity 选择器）。
 *  顶栏已上移至 home-page 的 TopNav（时间色谱共用外壳）。 */
export function HomeWorkspace(props: HomeWorkspaceProps) {
  const { currentView, data, filters, overlays, panel, subtaskActions } = props;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" }}>
      {filters.selectedTask && (currentView === "steps" || currentView === "timeline") && (
        <PlanFilterBar task={filters.selectedTask} onClear={filters.clearTaskFilter} />
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <HomeMainArea
          currentView={currentView}
          fetching={data.fetching}
          loadError={data.loadError}
          onRetry={data.loadSubtasks}
          stats={props.stats}
          narrow={props.narrow}
          filters={filters}
          overlays={overlays}
          panel={panel}
          subtaskActions={subtaskActions}
          onToggleSubtask={props.onToggleSubtask}
          onViewPlan={props.onViewPlan}
        />

        <div id="panel-right-container" style={{ display: "flex", height: "100%" }}>
          <RightPanel
            entries={panel.entries}
            focusedId={panel.focusedId}
            setFocusedId={panel.setFocusedId}
            regenAnalysis={panel.regenAnalysis}
            removeEntry={panel.removeEntry}
            onRequestDelete={subtaskActions.handleRequestDelete}
            onToggleSubtask={props.onToggleSubtask}
            onJumpToSubtask={overlays.handleJumpToSubtask}
            defaultCollapsed={currentView === "plans"}
            rows={props.rows}
            stats={props.stats}
          />
        </div>
      </div>

      <KbdFooter />
    </div>
  );
}
