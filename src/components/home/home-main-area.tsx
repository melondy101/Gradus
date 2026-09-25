"use client";

import type { NavView } from "@/components/layout/icon-rail";
import type { UserStats } from "@/lib/api/user-stats";
import type { HomeFilters } from "./use-home-filters";
import type { HomeOverlays } from "./use-home-overlays";
import type { SubtaskActions } from "./use-subtask-actions";
import type { AnalysisPanel } from "./use-analysis-panel";
import { TodayView } from "./today-view";
import { AllPlansView } from "./all-plans-view";
import { AscendingStepsView } from "./ascending-steps-view";
import { TimelineView } from "./timeline-view";
import { ViewStateCard } from "./view-state-card";

export interface HomeMainAreaProps {
  currentView: NavView;
  fetching: boolean;
  loadError: boolean;
  onRetry: () => void;
  stats: UserStats | null;
  narrow: boolean;
  filters: HomeFilters;
  overlays: HomeOverlays;
  panel: AnalysisPanel;
  subtaskActions: SubtaskActions;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
}

/** 首页中央工作区：今日聚焦 / 所有计划 / 拾级天梯 / 时间甘特 四视图分发。 */
export function HomeMainArea(props: HomeMainAreaProps) {
  const { currentView, filters, overlays, panel, subtaskActions } = props;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
      {/* VIEW 1: 今日聚焦 (Today) */}
      {currentView === "today" && (
        <TodayView
          fetching={props.fetching}
          loadError={props.loadError}
          onRetry={props.onRetry}
          stats={props.stats}
          metrics={filters.todayMetrics}
          narrow={props.narrow}
          todaySection={filters.todaySection}
          laterSections={filters.laterSections}
          totalRowCount={filters.displayedFlatRows.length}
          showOnlyPending={filters.showOnlyPending}
          selectedTag={filters.selectedTag}
          onToggleFilterPending={filters.handleToggleFilterPending}
          onClearTag={filters.clearTag}
          onOpen={(row) => overlays.setDetailSubtaskId(row.id)}
          onSelect={(row) => {
            overlays.setActiveSubtaskId(row.id);
            panel.setFocusedId(row.taskId);
            panel.focusTask(row.taskId);
          }}
          onToggle={(row, e) => {
            e.stopPropagation();
            props.onToggleSubtask(row.taskId, row.id, row.completed);
          }}
          onSkip={(row, e) => {
            e.stopPropagation();
            subtaskActions.handleSkip(row);
          }}
          onPostpone={(row, e) => {
            e.stopPropagation();
            subtaskActions.setPostponeTarget(row);
          }}
          activeSubtaskId={overlays.activeSubtaskId}
          focusedTaskId={panel.focusedId}
          highlightedSubtaskId={overlays.highlightedSubtaskId}
          onNewGoal={(goal) => panel.startAnalysis(goal)}
          onOpenDialog={() => overlays.setShowInput(true)}
          onOpenReport={() => {
            if (props.stats) overlays.handleOpenWeeklyReport(props.stats);
          }}
        />
      )}

      {/* VIEW 2: 所有计划 (All Plans) */}
      {currentView === "plans" && (
        <div
          className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {props.loadError ? (
            <div className="px-3.5 sm:px-5 pt-4">
              <ViewStateCard kind="error" onRetry={props.onRetry} />
            </div>
          ) : (
            <AllPlansView
              tasks={filters.displayedTasksList}
              onSelectTask={(taskId) => {
                panel.setFocusedId(taskId);
                panel.focusTask(taskId);
              }}
              onNewPlan={() => overlays.setShowInput(true)}
              onDeleteTask={(task) =>
                subtaskActions.handleRequestDelete(task.id, task.title, task.subtasks?.length)
              }
            />
          )}
        </div>
      )}

      {/* VIEW 3: 拾级天梯 (Ascending Steps) */}
      {currentView === "steps" && (
        <div
          className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {props.loadError ? (
            <div className="px-3.5 sm:px-5 pt-4">
              <ViewStateCard kind="error" onRetry={props.onRetry} />
            </div>
          ) : (
            <AscendingStepsView
              subtasks={filters.displayedSubtaskRows}
              onToggleSubtask={(s) => props.onToggleSubtask(s.taskId, s.id, s.completed)}
              onSelectSubtask={(s) => overlays.setDetailSubtaskId(s.id)}
            />
          )}
        </div>
      )}

      {/* VIEW 4: 时间甘特图 (Timeline) */}
      {currentView === "timeline" && (
        <div
          className="max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {props.loadError ? (
            <div className="px-3.5 sm:px-5 pt-4">
              <ViewStateCard kind="error" onRetry={props.onRetry} />
            </div>
          ) : (
            <TimelineView
              subtasks={filters.displayedSubtaskRows}
              onSelectSubtask={(s) => overlays.setDetailSubtaskId(s.id)}
              onToggleSubtask={(s) => props.onToggleSubtask(s.taskId, s.id, s.completed)}
            />
          )}
        </div>
      )}
    </div>
  );
}
