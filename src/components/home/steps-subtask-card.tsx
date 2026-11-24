"use client";

/**
 * 天梯任务行（对照 `steps.html` 的 `.step-task`）：
 * 8px 层级色轨 + 墨框方勾 + 标题/所属计划 + 右侧层级与时长。
 * 已完成：删除线 + 灰字；点击行打开子任务详情。
 */

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { T, bloomChromatic } from "@/lib/design-tokens";
import { deepHoursOf } from "@/lib/workload";
import { cn } from "@/utils/utils";
import { bloomOf } from "./subtask-line-model";

interface Props {
  item: SubtaskWithTask;
  onToggle: (item: SubtaskWithTask) => void;
  onSelect: (item: SubtaskWithTask) => void;
}

export function StepsSubtaskCard({ item, onToggle, onSelect }: Props) {
  const { level, config, known } = bloomOf(item);
  const color = known ? bloomChromatic(level) : T.lineCheck;
  const daily = deepHoursOf(item);

  return (
    <li
      role="button"
      tabIndex={0}
      aria-label={`查看子任务 ${item.title}`}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        "group grid cursor-pointer grid-cols-[8px_25px_minmax(0,1fr)_auto] items-center gap-3",
        "border-b border-bd-card py-4 transition-colors duration-[.16s]",
        "hover:bg-cream-light focus-visible:bg-cream-light focus-visible:outline-none"
      )}
    >
      <span className="h-12 w-2" style={{ background: color }} aria-hidden="true" />

      <button
        type="button"
        role="checkbox"
        aria-checked={item.completed}
        aria-label={item.completed ? "标记为未完成" : "标记完成"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(item);
        }}
        className="grid size-[25px] shrink-0 place-items-center border border-ink text-body-sm font-bold transition-colors duration-[.16s] hover:bg-ink hover:text-cream"
        style={item.completed ? { background: T.ink, color: T.bg } : undefined}
      >
        {item.completed ? "✓" : null}
      </button>

      <div className="min-w-0">
        <h3
          className={cn(
            "overflow-hidden text-ellipsis whitespace-nowrap text-body-lg leading-snug font-bold",
            item.completed
              ? "text-text-3 line-through decoration-bd-check"
              : "text-ink group-hover:text-error"
          )}
        >
          {item.title}
        </h3>
        <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-body-sm text-text-2">
          {item.taskTitle}
          {` · ${item.durationDays} 天 · ${daily.hours}h/天`}
        </p>
      </div>

      <div className="text-right">
        <b className="block text-body-sm font-bold whitespace-nowrap" style={{ color }}>
          {known ? `L${level} ${config.name}` : "层级未标注"}
        </b>
        <span className="mt-1 block font-mono text-caption whitespace-nowrap text-text-3">
          {item.durationDays} 天
        </span>
      </div>
    </li>
  );
}
