"use client";

/**
 * 计划库单卡（?view=plans）—— 卡片容器统一走 <Card> 原子件（§1.4），
 * 状态胶囊复用 Badge live/done/plan 三态（与复选框、甘特条同一语言）。
 */

import { X } from "lucide-react";
import { T } from "@/lib/design-tokens";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { TagBadge } from "@/components/task/tag-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/utils";

interface Props {
  task: TaskWithSubtasks;
  onOpen: (taskId: string) => void;
  onDelete?: (task: TaskWithSubtasks) => void;
}

const RING_R = 18;
const RING_C = 2 * Math.PI * RING_R;

export function PlanCard({ task, onOpen, onDelete }: Props) {
  const subtasks = task.subtasks || [];
  const total = subtasks.length;
  const completed = subtasks.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = total > 0 && completed === total;
  const state = isDone ? "done" : completed > 0 ? "live" : "plan";
  const stateLabel = isDone ? "已完结" : completed > 0 ? "进行中" : "已规划";
  const totalHours = subtasks.reduce(
    (sum, s) => sum + (s.deepWorkHours ? Number(s.deepWorkHours) || 0 : 0),
    0
  );
  const taskTags = parseTaskTags(task.tags);

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      aria-label={`打开计划 ${task.title}`}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      className={cn(
        "cursor-pointer gap-3.5 transition-[border-color,box-shadow,transform] duration-[.18s] ease-out",
        "hover:-translate-y-px hover:border-bd-check hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      )}
    >
      {/* 头部：标题与状态胶囊 */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <CardTitle className="line-clamp-2">{task.title}</CardTitle>
          {task.rawInput && task.rawInput !== task.title && (
            <p className="mt-1 truncate text-caption text-text-3">{task.rawInput}</p>
          )}
          {taskTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {taskTags.map((tag) => (
                <TagBadge key={tag} tag={tag} size="sm" />
              ))}
            </div>
          )}
        </div>
        <Badge state={state}>{stateLabel}</Badge>
      </div>

      {/* 进度环与关键统计 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="relative size-11 shrink-0">
            <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r={RING_R} fill="none" stroke={T.soft} strokeWidth="3.5" />
              <circle
                cx="22"
                cy="22"
                r={RING_R}
                fill="none"
                stroke={isDone ? T.success : T.accent}
                strokeWidth="3.5"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - (total > 0 ? completed / total : 0))}
                strokeLinecap="round"
                transform="rotate(-90 22 22)"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center font-mono text-micro font-bold text-ink">
              {pct}%
            </div>
          </div>
          <div>
            <div className="font-mono text-body font-bold text-ink">
              {completed} / {total}{" "}
              <span className="text-caption font-normal text-text-3">个子任务</span>
            </div>
            <div className="mt-0.5 text-caption text-text-3">
              预计 {task.totalDays || 7} 天排期
            </div>
          </div>
        </div>

        {totalHours > 0 && (
          <div className="rounded-field bg-cream-light px-2 py-1 text-right">
            <div className="font-mono text-body-sm font-bold text-ink">{totalHours.toFixed(1)}h</div>
            <div className="text-2xs text-text-3">深度专注</div>
          </div>
        )}
      </div>

      {/* 底部：起止与操作 */}
      <CardFooter className="justify-between text-body-sm">
        <span className="text-text-3">
          {task.startDate ? `始于 ${String(task.startDate).slice(5, 10)}` : "今日启动"}
        </span>
        <span className="flex items-center gap-2">
          {onDelete && (
            <Button
              size="icon-xs"
              variant="ghost"
              title="删除此计划"
              aria-label={`删除计划 ${task.title}`}
              className="hover:bg-error/10 hover:text-error"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
            >
              <X size={13} />
            </Button>
          )}
          <span className="font-semibold text-accent-ink">进入详情 →</span>
        </span>
      </CardFooter>
    </Card>
  );
}
