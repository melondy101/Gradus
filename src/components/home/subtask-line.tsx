"use client";

/**
 * 今日路线的一行（对照 `today.html` 的 `.task`）：
 * 8px 认知色轨 + 墨框方勾 + 标题/状态 + 右侧层级与工时。
 *
 * 三态：已完成（勾选 + 删除线）/ 进行中（层级色圆点）/ 待开始（空框）。
 * ⚠ id={`subtask-card-${row.id}`} 是键盘导航与 AI 面板「定位子任务」的 DOM 契约。
 */

import { useTranslation } from "react-i18next";
import { CalendarClock, SkipForward } from "lucide-react";
import { T, bloomChromatic } from "@/lib/design-tokens";
import { deepHoursOf } from "@/lib/workload";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { MiniActionButton } from "./mini-action-button";
import { getSubtaskDateRange } from "./subtask-row";
import { bloomOf, type SubtaskLineState } from "./subtask-line-model";
export { lineStateOf, type SubtaskLineState } from "./subtask-line-model";

interface Props {
  row: SubtaskWithTask;
  state: SubtaskLineState;
  isSelected?: boolean;
  isActive?: boolean;
  isHighlighted?: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onSkip?: (e: React.MouseEvent) => void;
  onPostpone?: (e: React.MouseEvent) => void;
}

export function SubtaskLine({
  row, state, isSelected, isActive, isHighlighted,
  onOpen, onSelect, onToggle, onSkip, onPostpone,
}: Props) {
  const { t } = useTranslation();
  const { level, config, known } = bloomOf(row);
  const color = known ? bloomChromatic(level) : T.lineCheck;
  const range = getSubtaskDateRange(row);
  const daily = deepHoursOf(row);
  const done = state === "done";
  const marked = isActive || isHighlighted;

  const lead =
    done ? t("home.subDone", "已完成")
    : state === "live" ? t("home.subLive", "进行中")
    : t("home.subTodo", "待开始");

  return (
    <li
      id={`subtask-card-${row.id}`}
      role="button"
      tabIndex={0}
      aria-label={row.title}
      aria-current={isSelected ? "true" : undefined}
      onClick={() => { onOpen(); onSelect(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onOpen(); onSelect(); }
      }}
      className={cn(
        "group grid cursor-pointer grid-cols-[8px_25px_minmax(0,1fr)_auto] items-center gap-3",
        "border-b border-bd-card py-4 transition-colors duration-[.16s]",
        "hover:bg-cream-light focus-visible:bg-cream-light focus-visible:outline-none",
        marked && "bg-cream-light"
      )}
    >
      <span className="h-12 w-2" style={{ background: color }} aria-hidden="true" />

      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? t("timelineCard.markUndone") : t("timelineCard.markDone")}
        onClick={(e) => { e.stopPropagation(); onToggle(e); }}
        className="grid size-[25px] shrink-0 place-items-center border border-ink text-body-sm font-bold transition-colors duration-[.16s] hover:bg-ink hover:text-cream"
        style={done ? { background: T.ink, color: T.bg } : undefined}
      >
        {done ? "✓" : state === "live" ? (
          <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
        ) : null}
      </button>

      <div className="min-w-0">
        <h3
          className={cn(
            "overflow-hidden text-ellipsis whitespace-nowrap text-body-lg leading-snug font-bold",
            done ? "text-text-3 line-through decoration-bd-check" : "text-ink group-hover:text-error"
          )}
        >
          {row.title}
        </h3>
        <p className="mt-1 text-body-sm text-text-2">
          {lead}
          {range ? ` · ${range}` : ` · ${t("timelineCard.days", { count: row.durationDays })}`}
          {row.topic ? ` · ${row.topic}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="invisible flex gap-1 group-hover:visible max-sm:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {!done && onPostpone && (
            <MiniActionButton label={t("timelineCard.postponeTitle", "顺延 1 天")} onClick={onPostpone}>
              <CalendarClock size={13} />
            </MiniActionButton>
          )}
          {!done && onSkip && (
            <MiniActionButton label={t("timelineCard.skipTitle", "跳过此任务")} onClick={onSkip}>
              <SkipForward size={13} />
            </MiniActionButton>
          )}
        </span>

        <div className="text-right">
          <b className="block text-body-sm font-bold whitespace-nowrap" style={{ color }}>
            {known ? `L${level} ${config.name}` : "层级未标注"}
          </b>
          <span className="mt-1 block font-mono text-caption whitespace-nowrap text-text-3">
            {daily.hours}h/天
          </span>
        </div>
      </div>
    </li>
  );
}
