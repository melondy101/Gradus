"use client";

/**
 * 天梯任务行卡（?view=steps）—— 左侧 4px Bloom 色条 + CheckBox 三态原子件，
 * 替换旧版自绘 20px 复选按钮与整排内联样式。
 */
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { T } from "@/lib/design-tokens";
import { Tag } from "@/components/ui/badge";
import { CheckBox } from "@/components/ui/check-box";
import { Card } from "@/components/ui/card";
import { BLOOM_TAG_CLASS, bloomOf } from "./subtask-line-model";
import { BLOOM_BORDER_CLASS } from "./task-accent";
import { cn } from "@/utils/utils";

interface Props {
  item: SubtaskWithTask;
  onToggle: (item: SubtaskWithTask) => void;
  onSelect: (item: SubtaskWithTask) => void;
}

export function StepsSubtaskCard({ item, onToggle, onSelect }: Props) {
  const { level, config } = bloomOf(item);
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      aria-label={`查看子任务 ${item.title}`}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        "cursor-pointer flex-row items-center gap-3 border-l-4 p-3",
        "transition-[border-color,box-shadow,transform] duration-[.15s] ease-out",
        "hover:-translate-y-px hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        BLOOM_BORDER_CLASS[level],
        item.completed && "opacity-75"
      )}
    >
      <CheckBox
        state={item.completed ? "done" : "todo"}
        size={20}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(item);
        }}
      />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-body font-semibold leading-snug",
            item.completed ? "text-text-2 line-through" : "text-ink"
          )}
        >
          {item.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-caption text-text-2">
          <span className="truncate">标 {item.taskTitle}</span>
          {item.deepWorkHours && (
            <span className="font-mono whitespace-nowrap">
              ⏱ {item.deepWorkHours}h 深度专注
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Tag className={cn("bg-transparent", BLOOM_TAG_CLASS[level])} style={{ background: config.bg }}>
          {config.name}
        </Tag>
        <span className="font-mono text-caption whitespace-nowrap" style={{ color: T.subtle }}>
          {item.durationDays} 天
        </span>
      </div>
    </Card>
  );
}
