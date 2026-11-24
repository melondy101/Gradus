"use client";

/**
 * 今日路线主列（对照 `today.html` 的 `.tasks`）：
 * 眉题 + 衬线标题 + 下划线式筛选 + 带认知色轨的任务行。
 *
 * 保留原交互：全部/仅待完成筛选（localStorage: gradus_today_filter_pending）、
 * 乐观勾选、顺延 / 跳过、键盘定位（#subtask-card-{id}）、标签筛选下的空态。
 */

import { useTranslation } from "react-i18next";
import { ChartNoAxesCombined, X } from "lucide-react";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
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
  onOpenReport?: () => void;
}

const tabClass = (active: boolean) =>
  cn(
    "border-b pb-0.5 text-body-sm transition-colors duration-[.16s]",
    active ? "border-error text-error" : "border-transparent text-text-2 hover:text-ink"
  );

export function TodayTaskList({
  section, metrics, showOnlyPending, selectedTag, totalRowCount,
  onToggleFilterPending, onClearTag, onOpen, onSelect, onToggle, onSkip, onPostpone,
  activeSubtaskId, focusedTaskId, highlightedSubtaskId, onOpenReport,
}: Props) {
  const { t } = useTranslation();
  const rows = section.rows;

  return (
    <section className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
        <div className="min-w-0">
          <Eyebrow>
            TODAY / {rows.length} 项
            {metrics.todayHours > 0 ? ` · ${metrics.todayHours} 小时` : ""}
          </Eyebrow>
          <h2 className="mt-1.5 font-chromatic text-title-lg leading-tight text-ink">
            {t("home.todayRoute", "今日学习路线")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 pb-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-filter-all-tasks"
              onClick={() => onToggleFilterPending(false)}
              className={tabClass(!showOnlyPending)}
            >
              {t("home.filterAll", "全部")} {totalRowCount}
            </button>
            <button
              type="button"
              id="btn-filter-pending-tasks"
              onClick={() => onToggleFilterPending(true)}
              className={tabClass(showOnlyPending)}
            >
              {t("home.filterPending", "待完成")} {metrics.pendingTotal}
            </button>
          </div>

          {selectedTag && (
            <button
              type="button"
              onClick={onClearTag}
              className="flex items-center gap-1 border border-ink px-2 py-1 text-micro text-ink"
              title={t("home.clearTagFilter", "清除标签筛选")}
            >
              {selectedTag}
              <X size={11} />
            </button>
          )}

          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="flex items-center gap-1 border border-ink px-2 py-1 text-micro text-ink transition-transform duration-[.16s] ease-out hover:-translate-y-px"
            >
              <ChartNoAxesCombined size={12} />
              学习周报
            </button>
          )}
        </div>
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
    </section>
  );
}
