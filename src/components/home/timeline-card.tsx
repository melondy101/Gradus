"use client";

/**
 * 时间轴上的单条子任务卡（屏一「后续排期」与时间甘特视图共用）。
 *
 * 与 <SubtaskLine> 的分工：今日桶用紧凑行，今日之后用信息量更大的卡片（带所属计划、
 * Bloom 微缩阶梯、悬停快捷操作）。三态语言一致：已完成墨底勾 / 进行中黄环 / 待开始空框。
 *
 * ⚠ id={`subtask-card-${row.id}`} 是键盘导航与 AI 面板「定位子任务」的 DOM 契约。
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, SkipForward } from "lucide-react";
import { Tag } from "@/components/ui/badge";
import { CheckBox } from "@/components/ui/check-box";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { BloomStaircase } from "./bloom-staircase";
import { Kbd } from "./kbd";
import { MiniActionButton } from "./mini-action-button";
import { BLOOM_BORDER_CLASS, BLOOM_TEXT_CLASS, taskAccentClass } from "./task-accent";

export { getSubtaskDateRange, getSubtaskActualDates } from "./subtask-row";

interface CardProps {
  row: SubtaskWithTask;
  isSelected: boolean;
  isHighlighted: boolean;
  isActive?: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onSkip: (e: React.MouseEvent) => void;
  onPostpone: (e: React.MouseEvent) => void;
}

function bloomLevelOf(row: SubtaskWithTask): number {
  return row.urgency
    ? Math.max(1, Math.min(6, 7 - row.urgency))
    : Math.max(1, Math.min(6, row.bloomLevel ?? 3));
}

function getDateLabel(row: SubtaskWithTask): string | null {
  if (!row.taskStartDate) return null;
  const base = new Date(row.taskStartDate);
  if (isNaN(base.getTime())) return null;
  const s = new Date(base);
  s.setDate(base.getDate() + row.startDay);
  const e = new Date(base);
  e.setDate(base.getDate() + row.startDay + row.durationDays - 1);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)}–${fmt(e)}`;
}

export function TimelineCard({
  row, isSelected, isHighlighted, isActive = false,
  onOpen, onSelect, onToggle, onSkip, onPostpone,
}: CardProps) {
  const { t } = useTranslation();
  const BLOOM_LABELS = t("timelineCard.bloom", { returnObjects: true }) as Record<number, string>;
  const [hovered, setHovered] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const prevCompleted = useRef(row.completed);

  useEffect(() => {
    if (!prevCompleted.current && row.completed) setAnimKey((k) => k + 1);
    prevCompleted.current = row.completed;
  }, [row.completed]);

  const bloomRaw = bloomLevelOf(row);
  const bloomLabel = BLOOM_LABELS[bloomRaw] ?? `L${bloomRaw}`;
  const dateRange =
    getDateLabel(row) ?? (row.taskStartDate ? null : t("timelineCard.days", { count: row.durationDays }));
  const deepHours = Math.min(4.5, Math.max(1.0, (row.durationDays || 1) * 1.5));

  return (
    <div
      id={`subtask-card-${row.id}`}
      role="button"
      tabIndex={0}
      aria-label={t("timelineCard.viewDetail", {
        title: row.title,
        done: row.completed ? t("timelineCard.completedMark") : "",
      })}
      onClick={() => { onOpen(); onSelect(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); onSelect(); }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group cursor-pointer overflow-hidden rounded-field border-l-[3.5px] border",
        "transition-[background-color,border-color,box-shadow,transform] duration-[.18s] ease-out",
        taskAccentClass(row.taskId, row.topic),
        row.completed ? "bg-cream-light opacity-70" : "bg-card",
        isHighlighted || isActive
          ? "border-accent shadow-md"
          : isSelected
          ? "border-bd-card"
          : hovered
          ? "border-bd-check shadow-md hover:-translate-y-px"
          : "border-bd-card shadow-sm"
      )}
    >
      {/* ── 键盘选中状态条 ── */}
      {isActive && !row.completed && (
        <div className="flex items-center gap-1.5 border-b border-bd-card bg-accent-soft px-3 py-[3px] text-caption font-semibold text-accent-ink">
          <Kbd>Space</Kbd>
          <span>{t("timelineCard.completeThis")}</span>
          <Kbd>↑↓</Kbd>
          <span>{t("timelineCard.toggle")}</span>
        </div>
      )}

      <div className="flex items-start gap-3 px-3.5 py-3">
        <CheckBox
          key={`box-${animKey}`}
          state={row.completed ? "done" : hovered ? "live" : "todo"}
          aria-label={row.completed ? t("timelineCard.markUndone") : t("timelineCard.markDone")}
          onClick={(e) => { e.stopPropagation(); onToggle(e); }}
          className={cn("mt-px", animKey > 0 && row.completed && "animate-[checkBounce_.28s_cubic-bezier(.2,.8,.2,1)_both]")}
        />

        {/* 内容区 */}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "mb-1.5 overflow-hidden text-ellipsis text-body leading-[1.4] font-semibold whitespace-nowrap",
              row.completed ? "text-text-3 line-through decoration-bd-check" : "text-ink"
            )}
          >
            {row.title}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Tag className="max-w-[140px] truncate px-2 py-px font-sans text-caption font-semibold tracking-normal">
              {row.taskTitle}
            </Tag>

            {/* Bloom 认知层级 */}
            <Tag className={cn("px-[7px] py-px", BLOOM_TEXT_CLASS[bloomRaw], BLOOM_BORDER_CLASS[bloomRaw])}>
              L{bloomRaw} · {bloomLabel}
            </Tag>

            {dateRange && (
              <Mono className="text-caption text-text-3">{dateRange}</Mono>
            )}
          </div>
        </div>

        {/* 右侧：微型认知阶梯 + 时长 + 悬停快捷操作 */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="hidden opacity-70 transition-opacity sm:block group-hover:opacity-100">
            <BloomStaircase levels={[bloomRaw]} completed={[row.completed]} size="sm" />
          </div>

          <div className="text-right">
            <div className="font-mono text-body leading-none font-bold text-ink">{deepHours}h</div>
            <div className="mt-0.5 font-mono text-micro text-text-3">
              {t("timelineCard.days", { count: row.durationDays })}
            </div>
          </div>

          {!row.completed && (
            <div
              className="flex items-center gap-0.5 opacity-70 transition-opacity duration-[.18s] group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MiniActionButton
                label={t("timelineCard.postponeTitle") || "顺延 1 天（自动重排接续计划）"}
                onClick={onPostpone}
              >
                <CalendarClock size={13} />
              </MiniActionButton>
              <MiniActionButton label={t("timelineCard.skipTitle")} onClick={onSkip}>
                <SkipForward size={13} />
              </MiniActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
