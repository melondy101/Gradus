"use client";

/**
 * 屏幕一 · 今日面板（《品牌与产品设计说明》§3 屏幕一）
 *
 * 结构逐段对应设计稿：
 *   页头 → 新目标卡 → 四张统计卡 → 双列（左「今日子任务」+ 右「AI 修订建议」深底卡）
 *   屏一之下再续「后续排期」（明日 / 本周 / 7 天后），保证旧版可浏览全部排期的能力不丢。
 *
 * ⚠ Props 名称与类型是 home-page 的调用契约，改动前同步 home-page。
 *   #today-task-area 是新手引导 step 3 的兜底锚点（onboarding-tour fallbackSelector）。
 */

import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { AchievementPanel } from "./achievement-panel";
import { GoalCard } from "./goal-card";
import { LaterSchedule } from "./later-schedule";
import { ListSkeleton } from "./list-skeleton";
import { TodayTaskList } from "./today-task-list";
import { ViewStateCard } from "./view-state-card";
import { ViewPageHead } from "./view-page-head";
import type { TimelineSection } from "./timeline-sections";
import type { TodayMetrics } from "./today-metrics";
import type { UserStats } from "./use-user-stats";

interface Props {
  fetching: boolean;
  loadError: boolean;
  onRetry: () => void;
  stats: UserStats | null;
  metrics: TodayMetrics;
  /** <=1024px：统计卡 2×2、双列退为单列 */
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
  onOpenPalette: () => void;
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
    onOpenPalette, onNewGoal, onOpenDialog, onOpenReport,
  } = props;

  const rowHandlers = { onOpen, onSelect, onToggle, onSkip, onPostpone };
  const selection = { activeSubtaskId, focusedTaskId, highlightedSubtaskId };
  const loading = fetching;

  return (
    <div id="today-task-area" className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* 移动端底部让位给悬浮 tab bar（含 iOS 安全区），桌面端只留 pb-5 */}
      <div className="relative min-w-0 flex-1 overflow-y-auto px-[28px] pt-[18px] pb-5 max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))] [scrollbar-width:thin]">
        <ViewPageHead
          title={t("home.viewToday", "今日面板")}
          eyebrow="TODAY"
          onOpenPalette={onOpenPalette}
          onOpenReport={stats ? onOpenReport : undefined}
        />

        <GoalCard onSubmit={onNewGoal} onOpenDialog={onOpenDialog} />

        {stats && !loading && (
          <AchievementPanel stats={stats} metrics={metrics} narrow={narrow} />
        )}

        {loadError ? (
          <ViewStateCard kind="error" onRetry={onRetry} />
        ) : (
          <section
            className="flex flex-col gap-3.5"
          >
            <div className="flex min-w-0 flex-col gap-3.5">
              {loading ? (
                <Card className="gap-0 px-[18px] py-4">
                  <CardHeader className="mb-1">
                    <CardTitle>{todaySection.label}</CardTitle>
                    <Mono className="text-micro text-text-3">{t("home.loading", "加载中…")}</Mono>
                  </CardHeader>
                  <ListSkeleton />
                </Card>
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
                  />
                  <LaterSchedule
                    sections={laterSections}
                    focusedTaskId={focusedTaskId}
                    activeSubtaskId={activeSubtaskId}
                    highlightedSubtaskId={highlightedSubtaskId}
                    {...rowHandlers}
                  />
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
