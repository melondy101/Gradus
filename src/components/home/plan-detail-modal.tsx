"use client";

import { BarChart3, CalendarDays, ExternalLink, Sparkles } from "lucide-react";
import type { NavView } from "@/components/layout/nav-items";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { T } from "@/lib/design-tokens";
import { parseTaskTags } from "@/lib/task-tags";
import { TagBadge } from "@/components/task/tag-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PlanSpectrum } from "./plan-spectrum";
import { getPlanViewModel } from "./plan-view-model";

interface PlanDetailModalProps {
  task: TaskWithSubtasks;
  onClose: () => void;
  onFocusAI: () => void;
  onOpenDetail: () => void;
  onViewPlan: (view: Extract<NavView, "steps" | "timeline">) => void;
}

export function PlanDetailModal({
  task,
  onClose,
  onFocusAI,
  onOpenDetail,
  onViewPlan,
}: PlanDetailModalProps) {
  const model = getPlanViewModel(task);
  const tags = parseTaskTags(task.tags);

  return (
    <Modal
      open
      onClose={onClose}
      title={<span className="font-chromatic">{task.title}</span>}
      eyebrow="PLAN DETAIL / 目标详情"
      width={560}
      className="rounded-none border border-ink"
      footerClassName="bg-cream"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button size="sm" variant="outline" className="rounded-none" onClick={onFocusAI}>
            <Sparkles size={14} />聚焦 AI
          </Button>
          <Button size="sm" variant="app" className="rounded-none" onClick={onOpenDetail}>
            进入完整详情<ExternalLink size={14} />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption text-text-3">目标原文</p>
            <p className="mt-1 text-body-lg leading-relaxed text-ink">{task.rawInput || task.title}</p>
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

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => <TagBadge key={tag} tag={tag} size="sm" />)}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 border-y border-bd-card py-4">
          <div><strong className="font-chromatic text-title-lg text-ink">{model.pct}%</strong><span className="mt-1 block text-caption text-text-2">完成进度</span></div>
          <div><strong className="font-chromatic text-title-lg text-ink">{model.completed}/{model.total}</strong><span className="mt-1 block text-caption text-text-2">子任务</span></div>
          <div><strong className="font-chromatic text-title-lg text-ink">{model.totalHours.toFixed(1)}h</strong><span className="mt-1 block text-caption text-text-2">预计投入</span></div>
        </div>

        <PlanSpectrum levels={model.subtasks.map((subtask) => subtask.bloomLevel || 1)} />

        <div className="space-y-2 text-body text-text-2">
          <p><span className="text-text-3">计划区间：</span>{model.rangeLabel}</p>
          <p>
            <span className="text-text-3">下一步：</span>
            {model.nextSubtask
              ? `${model.nextDateLabel} · ${model.nextSubtask.title}`
              : model.total > 0 ? "全部子任务已完成" : "等待 AI 生成子任务"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => onViewPlan("steps")}>
            <BarChart3 size={14} />查看认知阶梯
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onViewPlan("timeline")}>
            <CalendarDays size={14} />查看完整排期
          </Button>
        </div>
      </div>
    </Modal>
  );
}
