"use client";

import { T } from "@/lib/design-tokens";
import type { NavView } from "@/components/layout/nav-items";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { TagBadge } from "@/components/task/tag-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/utils";
import { PlanSpectrum } from "./plan-spectrum";
import { getPlanViewModel } from "./plan-view-model";

interface Props {
  task: TaskWithSubtasks;
  onOpen: (taskId: string) => void;
  onViewPlan: (taskId: string, view: Extract<NavView, "steps" | "timeline">) => void;
  onDelete?: (task: TaskWithSubtasks) => void;
}

export function PlanCard({ task, onOpen, onViewPlan, onDelete }: Props) {
  const model = getPlanViewModel(task);
  const taskTags = parseTaskTags(task.tags);
  const goal = task.rawInput?.trim();
  const showGoal = Boolean(goal && goal !== task.title);

  return (
    <Card
      size="sm"
      tone="soft"
      role="button"
      tabIndex={0}
      aria-label={`打开目标详情 ${task.title}`}
      onClick={() => onOpen(task.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
      style={{ borderLeft: `8px solid ${model.accent}`, borderColor: T.ink }}
      className={cn(
        "min-h-[280px] cursor-pointer gap-4 rounded-none p-5 shadow-none",
        "transition-[box-shadow,transform] duration-150 ease-out",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--ink)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <CardTitle className="line-clamp-2 font-chromatic text-title-lg leading-tight text-ink">
            {task.title}
          </CardTitle>
          {showGoal && (
            <p className="mt-2 line-clamp-2 text-body leading-relaxed text-text-2">{goal}</p>
          )}
        </div>
        <Badge
          state={model.state}
          className="shrink-0 rounded-none border px-2 py-1 font-mono text-body-sm tracking-normal"
          style={
            model.state === "done"
              ? { borderColor: T.ink, background: T.ink, color: T.bg }
              : { borderColor: model.accent, background: "transparent", color: model.accent }
          }
        >
          {model.stateLabel}
        </Badge>
      </div>

      {taskTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {taskTags.map((tag) => <TagBadge key={tag} tag={tag} size="sm" />)}
        </div>
      )}

      <div className="my-1 flex items-center gap-4">
        <div
          className="relative size-[70px] shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${model.accent} ${model.pct}%, ${T.lineCheck} 0)`,
          }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-[9px] grid place-items-center rounded-full"
            style={{ background: T.soft }}
          >
            <span className="font-mono text-body-sm font-bold text-ink">{model.pct}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <strong className="block text-body font-bold text-ink">
            {model.completed} / {model.total} 项完成
          </strong>
          <span className="mt-1.5 block text-body-sm text-text-2">
            {model.nextSubtask ? `下次安排 · ${model.nextDateLabel}` : model.rangeLabel}
          </span>
          {model.totalHours > 0 && (
            <span className="mt-1 block text-body-sm text-text-2">
              预计投入 {model.totalHours.toFixed(1)}h
            </span>
          )}
        </div>
      </div>

      <PlanSpectrum levels={model.subtasks.map((subtask) => subtask.bloomLevel || 1)} />

      <div
        className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3"
        style={{ borderColor: T.line }}
      >
        <span className="flex flex-wrap items-center gap-1">
          <Button size="xs" variant="link" className="h-auto px-1 text-body-sm" onClick={(event) => {
            event.stopPropagation(); onViewPlan(task.id, "steps");
          }}>查看阶梯</Button>
          <Button size="xs" variant="link" className="h-auto px-1 text-body-sm" onClick={(event) => {
            event.stopPropagation(); onViewPlan(task.id, "timeline");
          }}>查看排期</Button>
        </span>
        {onDelete && (
          <Button
            size="xs" variant="ghost" aria-label={`删除计划 ${task.title}`}
            className="h-auto px-1 text-body-sm text-text-3 hover:bg-error-soft hover:text-error"
            onClick={(event) => { event.stopPropagation(); onDelete(task); }}
          >删除</Button>
        )}
      </div>
    </Card>
  );
}
