"use client";

import { Filter, X } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";

interface PlanFilterBarProps {
  task: TaskWithSubtasks;
  onClear: () => void;
}

export function PlanFilterBar({ task, onClear }: PlanFilterBarProps) {
  return (
    <div className="flex flex-none flex-wrap items-center gap-2 border-b border-bd-card bg-cream-light px-4 py-2 sm:px-5">
      <Filter size={14} className="text-text-3" aria-hidden="true" />
      <span className="text-body-sm text-text-2">当前计划</span>
      <strong className="min-w-0 flex-1 truncate text-body-sm text-ink">{task.title}</strong>
      <Button size="xs" variant="ghost" onClick={onClear} aria-label={`清除计划筛选 ${task.title}`}>
        <X size={13} /> 显示全部计划
      </Button>
    </div>
  );
}
