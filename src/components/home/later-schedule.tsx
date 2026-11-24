"use client";

/**
 * 今日之后的接续排期（明日 / 本周 / 7 天后）。
 * 紧凑行：8px 认知色轨 + 方勾 + 标题/所属计划 + 右侧层级与工时，
 * 与今日路线共用同一套语言，不再使用旧的白卡 + 大色块。
 */

import { useTranslation } from "react-i18next";
import { T, bloomChromatic } from "@/lib/design-tokens";
import { deepHoursOf } from "@/lib/workload";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { getSubtaskDateRange } from "./subtask-row";
import { bloomOf } from "./subtask-line-model";
import type { TimelineSection } from "./timeline-sections";

interface Props {
  sections: TimelineSection[];
  focusedTaskId: string | null;
  activeSubtaskId: string | null;
  highlightedSubtaskId: string | null;
  onOpen: (row: SubtaskWithTask) => void;
  onSelect: (row: SubtaskWithTask) => void;
  onToggle: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onSkip: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onPostpone: (row: SubtaskWithTask, e: React.MouseEvent) => void;
}

export function LaterSchedule({
  sections, focusedTaskId, activeSubtaskId, highlightedSubtaskId,
  onOpen, onSelect, onToggle,
}: Props) {
  const { t } = useTranslation();
  const visible = sections.filter((section) => section.key !== "today" && section.rows.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="mt-10 flex flex-col gap-8">
      {visible.map((section) => (
        <section key={section.key}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-2">
            <div>
              <Eyebrow>
                {section.key.toUpperCase()} / {section.rows.length} 项
              </Eyebrow>
              <h3 className="mt-1 font-chromatic text-title-sm leading-tight text-ink">
                {section.label}
              </h3>
            </div>
            <span className="pb-1 font-mono text-caption text-text-2">{section.sublabel}</span>
          </div>

          <ul className="flex flex-col">
            {section.rows.map((row) => {
              const { level, config, known } = bloomOf(row);
              const color = known ? bloomChromatic(level) : T.lineCheck;
              const range = getSubtaskDateRange(row);
              const marked = activeSubtaskId === row.id || highlightedSubtaskId === row.id;

              return (
                <li
                  key={row.id}
                  id={`subtask-card-${row.id}`}
                  role="button"
                  tabIndex={0}
                  aria-label={row.title}
                  aria-current={focusedTaskId === row.taskId ? "true" : undefined}
                  onClick={() => { onOpen(row); onSelect(row); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onOpen(row); onSelect(row);
                    }
                  }}
                  className={cn(
                    "group grid cursor-pointer grid-cols-[8px_22px_minmax(0,1fr)_auto] items-center gap-3",
                    "border-b border-bd-card py-3 transition-colors duration-[.16s]",
                    "hover:bg-cream-light focus-visible:bg-cream-light focus-visible:outline-none",
                    marked && "bg-cream-light"
                  )}
                >
                  <span className="h-10 w-2" style={{ background: color }} aria-hidden="true" />

                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.completed}
                    aria-label={row.completed ? t("timelineCard.markUndone") : t("timelineCard.markDone")}
                    onClick={(event) => { event.stopPropagation(); onToggle(row, event); }}
                    className="grid size-[22px] shrink-0 place-items-center border border-ink text-micro font-bold transition-colors duration-[.16s] hover:bg-ink hover:text-cream"
                    style={row.completed ? { background: T.ink, color: T.bg } : undefined}
                  >
                    {row.completed ? "✓" : null}
                  </button>

                  <div className="min-w-0">
                    <h4
                      className={cn(
                        "overflow-hidden text-ellipsis whitespace-nowrap text-body font-bold",
                        row.completed ? "text-text-3 line-through decoration-bd-check" : "text-ink group-hover:text-error"
                      )}
                    >
                      {row.title}
                    </h4>
                    <p className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-body-sm text-text-2">
                      {row.taskTitle}
                      {range ? ` · ${range}` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <b className="block text-caption font-bold whitespace-nowrap" style={{ color }}>
                      {known ? `L${level} ${config.name}` : "层级未标注"}
                    </b>
                    <span className="mt-0.5 block font-mono text-caption whitespace-nowrap text-text-3">
                      {deepHoursOf(row).hours}h/天
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
