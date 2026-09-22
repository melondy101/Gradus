"use client";

/**
 * 屏一左列「今日子任务」卡（《品牌与产品设计说明》§3 屏幕一，原 app.css
 * `.card.list` `.card__head` `.subs`）。
 *
 * 保留原有交互：仅待完成筛选（localStorage: gradus_today_filter_pending）、
 * 乐观勾选、跳过 / 顺延、键盘定位（#subtask-card-{id}）、标签过滤下的空态。
 */

import { useTranslation } from "react-i18next";
import { ListFilter, Tag as TagIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Mono } from "@/components/ui/eyebrow";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { FilterChip } from "./filter-chip";
import { SubtaskLine, lineStateOf } from "./subtask-line";
import { TodayListEmpty } from "./today-list-empty";
import type { TimelineSection } from "./timeline-sections";
import type { TodayMetrics } from "./today-metrics";

interface Props {
  section: TimelineSection;
  metrics: TodayMetrics;
  showOnlyPending: boolean;
  selectedTag: string | null;
  totalRowCount: number;
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
}

export function TodayTaskList({
  section, metrics, showOnlyPending, selectedTag, totalRowCount,
  onToggleFilterPending, onClearTag, onOpen, onSelect, onToggle, onSkip, onPostpone,
  activeSubtaskId, focusedTaskId, highlightedSubtaskId,
}: Props) {
  const { t } = useTranslation();
  const rows = section.rows;

  return (
    <Card className="gap-0 px-[18px] pt-4 pb-2.5">
      <CardHeader className="mb-1">
        <CardTitle>{section.label}</CardTitle>
        <Mono className="text-[10px] text-text-3">
          {rows.length} 项{metrics.todayHours > 0 ? ` · ${metrics.todayHours} 小时` : ""}
        </Mono>
      </CardHeader>

      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <FilterChip
          id="btn-filter-all-tasks"
          active={!showOnlyPending}
          onClick={() => onToggleFilterPending(false)}
          icon={<ListFilter size={12} />}
          label={`${t("home.filterAll", "全部")} ${totalRowCount}`}
          title={t("home.filterAllTitle", "展示所有任务（含已完成）")}
        />
        <FilterChip
          id="btn-filter-pending-tasks"
          active={showOnlyPending}
          onClick={() => onToggleFilterPending(true)}
          icon={<ListFilter size={12} />}
          label={`${t("home.filterPending", "仅待完成")} ${metrics.pendingTotal}`}
          title={t("home.filterPendingTitle", "仅展示未完成任务，减轻信息密度")}
        />
        {selectedTag && (
          <Chip
            selected
            onClick={onClearTag}
            className="gap-[5px] border-ink bg-ink text-cream"
          >
            <TagIcon size={12} />
            {selectedTag}
          </Chip>
        )}
      </div>

      {rows.length === 0 ? (
        <TodayListEmpty
          selectedTag={selectedTag}
          showOnlyPending={showOnlyPending}
          onClearTag={onClearTag}
          onShowAll={() => onToggleFilterPending(false)}
        />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <SubtaskLine
              key={row.id}
              row={row}
              state={lineStateOf(row, section.key)}
              isSelected={focusedTaskId === row.taskId}
              isActive={activeSubtaskId === row.id}
              isHighlighted={highlightedSubtaskId === row.id}
              onOpen={() => onOpen(row)}
              onSelect={() => onSelect(row)}
              onToggle={(e) => onToggle(row, e)}
              onSkip={(e) => onSkip(row, e)}
              onPostpone={(e) => onPostpone(row, e)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
