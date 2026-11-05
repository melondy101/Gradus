"use client";

/**
 * 今日路线（时间色谱 · 视图一，对照 `design-demos/time-chromatics/today.html`）
 *
 * 布局：左栏（叙事 + 真实统计 + 色谱 + 新目标）/ 主列（今日路线 + 接续排期）/ 底部本周色带。
 * 原「今日面板」的全部能力都还在：筛选、勾选、顺延、跳过、打开详情、聚焦 AI、周报。
 *   #today-task-area 是新手引导 step 3 的兜底锚点（onboarding-tour fallbackSelector）。
 */

import { useTranslation } from "react-i18next";
import { T } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { LaterSchedule } from "./later-schedule";
import { ListSkeleton } from "./list-skeleton";
import { TodayIntro } from "./today-intro";
import { TodayTaskList } from "./today-task-list";
import { ViewStateCard } from "./view-state-card";
import { WeekStrip } from "./week-strip";
import type { TimelineSection } from "./timeline-sections";
import type { TodayMetrics } from "./today-metrics";
import type { UserStats } from "./use-user-stats";

interface Props {
  fetching: boolean;
  loadError: boolean;
  onRetry: () => void;
  stats: UserStats | null;
  metrics: TodayMetrics;
  /** <=1024px：左栏改为整宽置顶 */
  narrow: boolean;
  todaySection: TimelineSection;
  laterSections: TimelineSection[];
  totalRowCount: number;
  showOnlyPending: boolean;
  selectedTag: string | null;
  onToggleFilterPending: (onlyPending: boolean) => void;
  onClearTag: () => void;
  onOpen: (row: SubtaskWithTask) => void;
  onSelect: (row: SubtaskWithTask) => void;
  onToggle: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onSkip: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onPostpone: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  activeSubtaskId: string | null;
  focusedTaskId: string | null;
  highlightedSubtaskId: string | null;
  onNewGoal: (goal: string) => void;
  onOpenDialog: (goal: string) => void;
  onOpenReport: () => void;
}

export function TodayView(props: Props) {
  const { t } = useTranslation();
  const {
    fetching, loadError, onRetry, stats, metrics, narrow,
    todaySection, laterSections, totalRowCount, showOnlyPending, selectedTag,
    onToggleFilterPending, onClearTag, onOpen, onSelect, onToggle, onSkip, onPostpone,
    activeSubtaskId, focusedTaskId, highlightedSubtaskId,
    onNewGoal, onOpenDialog, onOpenReport,
  } = props;

  const rowHandlers = { onOpen, onSelect, onToggle, onSkip, onPostpone };
  const selection = { activeSubtaskId, focusedTaskId, highlightedSubtaskId };
  const loading = fetching;

  const allRows = [todaySection, ...laterSections].flatMap((section) => section.rows);

  return (
    <div id="today-task-area" className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* 移动端底部让位给悬浮 tab bar（含 iOS 安全区） */}
      <div className="min-w-0 flex-1 overflow-y-auto pb-5 max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))] [scrollbar-width:thin]">
        <div
          className="grid min-h-full grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]"
          style={{ background: T.bg }}
        >
          <TodayIntro
            stats={stats}
            metrics={metrics}
            narrow={narrow}
            onNewGoal={onNewGoal}
            onOpenDialog={onOpenDialog}
          />

          <div className="flex min-w-0 flex-col px-5 py-6 sm:px-8">
            {loadError ? (
              <ViewStateCard kind="error" onRetry={onRetry} />
            ) : loading ? (
              <div className="border border-bd-card px-4 py-3">
                <ListSkeleton />
                <p className="mt-2 font-mono text-micro tracking-[.16em] text-text-3">
                  {t("home.loading", "加载中…")}
                </p>
              </div>
            ) : (
              <>
                <TodayTaskList
                  section={todaySection}
                  metrics={metrics}
                  showOnlyPending={showOnlyPending}
                  selectedTag={selectedTag}
                  totalRowCount={totalRowCount}
                  onToggleFilterPending={onToggleFilterPending}
                  onClearTag={onClearTag}
                  {...rowHandlers}
                  {...selection}
                  onOpenReport={stats ? onOpenReport : undefined}
                />
                <LaterSchedule sections={laterSections} {...rowHandlers} {...selection} />
              </>
            )}
          </div>
        </div>

        {!loadError && !loading && <WeekStrip rows={allRows} />}
      </div>
    </div>
  );
}
