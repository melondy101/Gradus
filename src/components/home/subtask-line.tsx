"use client";

/**
 * 今日列表的单行子任务（《品牌与产品设计说明》§3 屏一，原 app.css
 * `.sub` / `.sub__c` / `.sub__t` / `.box` 三态）。
 *
 * 三态规则（§3）由 <CheckBox state> 承载：
 *   已完成 → 墨底反白勾 + 标题删除线（--text-3，划线色 --bd-check）
 *   进行中 → 黄描边 + 呼吸点
 *   待开始 → 素色空框
 *
 * ⚠ id={`subtask-card-${row.id}`} 是键盘导航（↑↓）与 AI 面板「定位子任务」的
 *   DOM 契约，改名前先确认 use-home-hotkeys / home-page 的跳转。
 */

import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarClock, SkipForward } from "lucide-react";
import { CheckBox } from "@/components/ui/check-box";
import { Tag } from "@/components/ui/badge";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { MiniActionButton } from "./mini-action-button";
import { getSubtaskDateRange } from "./subtask-row";
import { BLOOM_TAG_CLASS, bloomOf, hoursOf, type SubtaskLineState } from "./subtask-line-model";
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
  const { level, config } = bloomOf(row);
  const range = getSubtaskDateRange(row);
  const marked = isActive || isHighlighted;

  const lead =
    state === "done" ? t("home.subDone", "已完成")
    : state === "live" ? t("home.subLive", "进行中")
    : t("home.subTodo", "待开始");

  return (
    <li
      id={`subtask-card-${row.id}`}
      role="button"
      tabIndex={0}
      aria-label={row.title}
      onClick={() => { onOpen(); onSelect(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onOpen(); onSelect(); }
      }}
      className={cn(
        "group grid cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-3",
        "border-t border-bd-card py-[9px] pr-2 pl-[5px] transition-colors duration-[.16s]",
        "first:border-t-0 hover:bg-cream-light focus-visible:bg-cream-light focus-visible:outline-none",
        marked && "bg-cream-light shadow-[inset_3px_0_0_var(--accent)]",
        !marked && isSelected && "hover:bg-cream-light"
      )}
    >
      <CheckBox
        state={state}
        aria-label={row.completed ? t("timelineCard.markUndone") : t("timelineCard.markDone")}
        onClick={(e) => { e.stopPropagation(); onToggle(e); }}
      />

      <div className="min-w-0">
        <b
          className={cn(
            "block overflow-hidden text-ellipsis text-[14.5px] leading-[1.4] font-bold whitespace-nowrap",
            state === "done"
              ? "text-text-3 line-through decoration-bd-check"
              : "text-ink"
          )}
        >
          {row.title}
        </b>
        <p className="mt-0.5 text-[12px] text-text-3">
          {lead}
          {range ? ` · ${range}` : ` · ${t("timelineCard.days", { count: row.durationDays })}`}
          {row.topic ? ` · ${row.topic}` : ""}
        </p>
      </div>

      <Tag className={BLOOM_TAG_CLASS[level]}>
        L{level} {config.name}
      </Tag>

      <div className="flex items-center gap-1.5">
        {state !== "done" && (onPostpone || onSkip) && (
          <span
            className="invisible flex gap-0.5 group-hover:visible"
            onClick={(e) => e.stopPropagation()}
          >
            {onPostpone && (
              <MiniActionButton label={t("timelineCard.postponeTitle", "顺延 1 天")} onClick={onPostpone}>
                <CalendarClock size={13} />
              </MiniActionButton>
            )}
            {onSkip && (
              <MiniActionButton label={t("timelineCard.skipTitle", "跳过此任务")} onClick={onSkip}>
                <SkipForward size={13} />
              </MiniActionButton>
            )}
          </span>
        )}
        <Mono className="text-[10px] whitespace-nowrap text-text-3">
          {hoursOf(row)}h
          <ArrowRight
            size={11}
            className="ml-1 inline opacity-25 transition-opacity duration-[.16s] group-hover:opacity-100"
          />
        </Mono>
      </div>
    </li>
  );
}
