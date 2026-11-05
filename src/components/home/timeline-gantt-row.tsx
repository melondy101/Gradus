"use client";

/**
 * 接续排期的一行（对照 `timeline.html` 的 `.gantt-label` / `.day-cell` / `.gantt-bar`）：
 * 左侧固定列（勾选 + 子任务名 + 所属计划），右侧按日对齐的网格与色条。
 * 色条颜色 = 认知层级（BLOOM_CHROMATIC），长度 = 持续天数；今天所在列淡朱砂底。
 */

import { T, bloomChromatic } from "@/lib/design-tokens";
import { fmtShortDate } from "@/components/task/task-dates";
import { cn } from "@/utils/utils";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { bloomOf } from "./subtask-line-model";

export interface TimelineGanttRowProps {
  item: SubtaskWithTask;
  dayCount: number;
  /** 今天在窗口内的列下标（0 起）；-1 表示今天不在窗口内 */
  todayIdx: number;
  /** 条形起始列（0 起）；null 表示排期未定（无 absolute 日期） */
  startIdx: number | null;
  duration: number;
  zebra: boolean;
  /** 左侧固定列宽度（移动端收窄，给日期列留空间） */
  labelWidth: number;
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
}

export function TimelineGanttRow({
  item,
  dayCount,
  todayIdx,
  startIdx,
  duration,
  zebra,
  labelWidth,
  onSelectSubtask,
  onToggleSubtask,
}: TimelineGanttRowProps) {
  const { level, config } = bloomOf(item);
  const color = bloomChromatic(level);
  /** 金 / 赭两级底色偏亮，用墨字才读得清 */
  const lightBar = level === 2 || level === 3;
  const start = item.absoluteStart ? new Date(item.absoluteStart) : null;
  const end = item.absoluteEnd ? new Date(item.absoluteEnd) : null;
  const dateLabel = start && end
    ? `${fmtShortDate(start)} → ${fmtShortDate(end)} · 共${duration}天`
    : "排期未定";

  return (
    <div
      className={cn("grid items-stretch border-b border-bd-card", zebra && "bg-cream")}
      style={{ gridTemplateColumns: `${labelWidth}px repeat(${dayCount}, minmax(64px, 1fr))` }}
    >
      <div
        data-gantt-interactive
        onClick={() => onSelectSubtask(item)}
        className={cn(
          "sticky left-0 z-20 flex cursor-pointer items-center gap-2 border-r border-ink px-4 py-3",
          zebra ? "bg-cream" : "bg-cream-light"
        )}
      >
        <button
          type="button"
          role="checkbox"
          aria-checked={item.completed}
          aria-label={item.completed ? "标记为未完成" : "标记完成"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSubtask(item);
          }}
          className="grid size-[20px] shrink-0 place-items-center border border-ink text-micro font-bold transition-colors duration-[.16s] hover:bg-ink hover:text-cream"
          style={item.completed ? { background: T.ink, color: T.bg } : undefined}
        >
          {item.completed ? "✓" : null}
        </button>

        <div className="min-w-0">
          <b
            className={cn(
              "block overflow-hidden text-ellipsis whitespace-nowrap text-body font-bold",
              item.completed ? "text-text-3 line-through decoration-bd-check" : "text-ink"
            )}
          >
            {item.title}
          </b>
          <span className="mt-0.5 block overflow-hidden text-ellipsis whitespace-nowrap text-caption text-text-2">
            {item.taskTitle} · L{level} {config.name}
          </span>
        </div>
      </div>

      <div
        className="relative grid min-h-[61px]"
        style={{
          gridColumn: `2 / span ${dayCount}`,
          gridTemplateColumns: `repeat(${dayCount}, minmax(64px, 1fr))`,
        }}
      >
        {Array.from({ length: dayCount }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "border-r border-bd-card last:border-r-0",
              index === todayIdx && "bg-error-soft"
            )}
          />
        ))}

        {startIdx === null ? (
          <span className="z-10 self-center pl-3 text-caption text-text-3">排期未定</span>
        ) : (
          <button
            type="button"
            data-gantt-interactive
            onClick={() => onSelectSubtask(item)}
            title={`${item.title} ${dateLabel}`}
            className={cn(
              "z-10 mx-1 h-[30px] cursor-pointer self-center overflow-hidden border-0 px-2 text-left text-caption font-bold whitespace-nowrap",
              "transition-[box-shadow,opacity] duration-[.16s]",
              "shadow-[2px_2px_0_var(--bd-check)] hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            )}
            style={{
              gridColumn: `${startIdx + 1} / span ${duration}`,
              gridRow: 1,
              background: color,
              color: lightBar ? T.ink : T.bg,
            }}
          >
            {item.completed ? "✓ " : ""}
            {item.title}
          </button>
        )}
      </div>
    </div>
  );
}
