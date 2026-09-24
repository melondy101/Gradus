"use client";

import type { NavView } from "@/components/layout/icon-rail";
import type { UserStats } from "@/lib/api/user-stats";
import type { HomeFilters } from "./use-home-filters";
import type { HomeOverlays } from "./use-home-overlays";
import type { SubtaskActions } from "./use-subtask-actions";
import type { AnalysisPanel } from "./use-analysis-panel";
import { AppHeader } from "./app-header";
import { KbdFooter } from "./kbd-footer";
import { RightPanel } from "./right-panel";
import { HomeMainArea } from "./home-main-area";

export interface HomeWorkspaceProps {
  currentView: NavView;
  data: { fetching: boolean; loadError: boolean; loadSubtasks: () => void };
  filters: HomeFilters;
  overlays: HomeOverlays;
  panel: AnalysisPanel;
  subtaskActions: SubtaskActions;
  stats: UserStats | null;
  narrow: boolean;
  showLevelBadge: boolean;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
}

/** 中央列：顶栏 + 主视图/右栏工作区 + 键位脚注（#panel-right-container 为 audit:parity 选择器）。 */
export function HomeWorkspace(props: HomeWorkspaceProps) {
  const { currentView, data, filters, overlays, panel, subtaskActions } = props;
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%", overflow: "hidden" }}>
      <AppHeader
        currentView={currentView}
        selectedTag={filters.selectedTag}
        onClearTag={filters.clearTag}
        onOpenPalette={() => overlays.setCommandPaletteOpen(true)}
        showLevelBadge={props.showLevelBadge}
      />

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
          />
        </div>
      </div>

      <KbdFooter />
    </div>
  );
}
