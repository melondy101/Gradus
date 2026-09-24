"use client";

/**
 * AI 深底卡内的「计划详情」主体（§3 屏一右列 + 屏三计划预览，原 app.css
 * `.prog__bar` / 深色 `.subs` / `.sug` / `.ai-dark__foot`）。
 * 全部数值来自 entry.task（analyze 缓冲 JSON 水化后的真实数据）。
 */

import { useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Textarea } from "@/components/ui/input";
import type { AnalysisEntry, Resource } from "./use-analysis-panel";
import { parseSubtaskResources, summarizePlan } from "./ai-review-hints";
import { AiPlanSubtaskRow } from "./ai-plan-subtask-row";
import { AiResourceRow } from "./ai-resource-row";

interface Props {
  entry: AnalysisEntry;
  /** 调整意见受控于父级 AiInspector，便于「建议 → 填入调整意见」联动 */
  adjustment: string;
  onAdjustmentChange: (value: string) => void;
  onRegen: (taskId: string, adjustment: string) => void;
  onRemove: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  onJumpToSubtask?: (subtaskId: string) => void;
}

export function AiEntryDetail({
  entry, adjustment, onAdjustmentChange, onRegen, onRemove, onToggleSubtask, onJumpToSubtask,
}: Props) {
  const [showResources, setShowResources] = useState(false);
  const task = entry.task;
  if (!task) return null;

  const subs = task.subtasks;
  const completed = subs.filter((s) => s.completed).length;
  const pct = subs.length > 0 ? completed / subs.length : 0;
  const sum = summarizePlan(entry);

  const allResources: Resource[] = [];
  for (const s of subs) {
    for (const r of parseSubtaskResources(s)) {
      if (!allResources.some((x) => x.title === r.title)) allResources.push(r);
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      {/* 进度：黄色仅用于「进行中」推进条 */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <Eyebrow kind="label" className="mb-0 text-on-dark-3">Progress</Eyebrow>
          <Mono className="text-on-dark-2">{completed} / {subs.length} · {Math.round(pct * 100)}%</Mono>
        </div>
        <div className="h-2 overflow-hidden rounded-chip-sm border border-bd-dark bg-on-dark/[.08]">
          <div
            className="h-full rounded-chip-sm bg-accent transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
      </div>

      {/* 子任务清单 */}
      <ul className="flex flex-col">
        {subs.map((s) => (
          <AiPlanSubtaskRow
            key={s.id}
            title={s.title}
            description={s.description}
            completed={s.completed}
            bloomLevel={s.bloomLevel ?? 1}
            durationDays={s.durationDays}
            onToggle={() => onToggleSubtask(entry.taskId, s.id, s.completed)}
            onJump={() => onJumpToSubtask?.(s.id)}
          />
        ))}
      </ul>

      {/* 推荐资源（真实检索结果，含可信度标注） */}
      {allResources.length > 0 && (
        <div>
          <Button variant="onDark" size="xs" onClick={() => setShowResources((v) => !v)}>
            {showResources ? "收起资源" : `全部推荐资源 (${allResources.length})`}
          </Button>
          {showResources && (
            <ul className="mt-2 flex flex-col">
              {allResources.map((r) => (
                <AiResourceRow key={r.title} res={r} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 调整意见 → 重新生成（真实调用 analyze?adjustment） */}
      <div className="flex flex-col gap-2">
        <Eyebrow kind="label" className="mb-0 text-on-dark-3">Adjustment</Eyebrow>
        <Textarea
          value={adjustment}
          onChange={(e) => onAdjustmentChange(e.target.value)}
          rows={2}
          placeholder="例：难度太高 / 专注某模块 / 增加实践内容"
          className="resize-y border-bd-dark bg-on-dark/[.05] px-3 py-[9px] text-body leading-[1.5] text-on-dark placeholder:text-on-dark-3 focus:border-on-dark-3"
        />
        <div className="flex gap-2">
          <Button
            variant="accent"
            size="xs"
            className="flex-1 rounded-field"
            onClick={() => { onRegen(entry.taskId, adjustment); }}
          >
            <RotateCcw size={12} /> 按意见重排
          </Button>
          <Button variant="onDark" size="xs" onClick={() => onRemove(entry.taskId)}>
            <Trash2 size={12} /> 移除
          </Button>
        </div>
      </div>

      <p className="mt-1 border-t border-bd-dark pt-2.5 font-mono text-2xs tracking-[.04em] text-on-dark-3">
        子任务 {sum.subtaskCount} · 资源 {sum.resourceCount}（已校验 {sum.verifiedCount}）· 排期 {sum.totalDays} 天 · 深度工时 {sum.deepHours}H
      </p>
    </div>
  );
}
