"use client";

/**
 * AI 规划面板主体（§3 屏一右列 / §4.4「深色卡给 AI 建议」）。
 *
 * 这是全站唯一的 AI 分析视图：屏一的深底卡与右侧检查栏复用同一份组件，
 * 数据全部来自 home-page 的 useAnalysisPanel()，此处绝不二次请求。
 * 外壳（<Card tone="dark"> / 右栏 / 移动抽屉）由 <RightPanel> 负责。
 */

import { useState } from "react";
import { AiEntryDetail } from "./ai-entry-detail";
import { AiEntryTab } from "./ai-entry-tab";
import { AiIdleHint } from "./ai-idle-hint";
import { AiPipelineSteps } from "./ai-pipeline-steps";
import type { PipelineSize } from "./ai-pipeline-node";
import { AiReviewHintRow } from "./ai-review-hint-row";
import {
  PIPELINE_STAGES,
  isRunningPhase,
  stageIndexOf,
  type AnalysisEntry,
} from "./use-analysis-panel";
import { deriveReviewHints } from "./ai-review-hints";
import { CardHeader } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";

interface Props {
  entries: AnalysisEntry[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  regenAnalysis: (taskId: string, adjustment: string) => void;
  removeEntry: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  onJumpToSubtask?: (subtaskId: string) => void;
  /** 窄容器（380px 卡 / 350px 右栏 / 移动抽屉）收窄流水线节点 */
  nodeSize?: PipelineSize;
}

function headline(entry: AnalysisEntry | null, hints: number): string {
  if (!entry) return "AI 规划流水线";
  if (entry.stream.phase === "error") return "分析中断";
  if (isRunningPhase(entry.stream.phase)) return "AI 正在规划";
  return hints > 0 ? `修订建议 ${hints} 条` : "计划已核查通过";
}

export function AiInspector({
  entries,
  focusedId,
  setFocusedId,
  regenAnalysis,
  removeEntry,
  onToggleSubtask,
  onJumpToSubtask,
  nodeSize = "md",
}: Props) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [adjustment, setAdjustment] = useState("");

  const focused = entries.find((e) => e.taskId === focusedId) ?? entries[0] ?? null;
  const done = focused ? focused.stream.phase === "done" && !!focused.task : false;
  const allHints = focused && done ? deriveReviewHints(focused) : [];
  const hints = allHints.filter((h) => !dismissed.includes(h.id));
  const stageIdx = focused ? stageIndexOf(focused.stream.phase) : -1;

  return (
    <div className="flex flex-col gap-3">
      <CardHeader className="mb-0">
        <Eyebrow tone="accent">AI Review</Eyebrow>
        <Mono className="text-on-dark-3">
          {focused
            ? done
              ? `${PIPELINE_STAGES.length} / ${PIPELINE_STAGES.length} 阶段`
              : `阶段 ${Math.max(stageIdx + 1, 1)} / ${PIPELINE_STAGES.length}`
            : "待启动"}
        </Mono>
      </CardHeader>

      <h3 className="mb-1 text-[17px] leading-snug font-bold text-on-dark">
        {headline(focused, hints.length)}
      </h3>

      {entries.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {entries.map((e) => (
            <AiEntryTab
              key={e.taskId}
              label={e.taskTitle}
              active={focused?.taskId === e.taskId}
              onClick={() => setFocusedId(e.taskId)}
            />
          ))}
        </div>
      )}

      {focused && <AiPipelineSteps stream={focused.stream} tone="dark" size={nodeSize} />}

      {focused?.stream.errorMsg && (
        <p className="font-mono text-[13px] leading-[20px] text-error">
          {focused.stream.errorMsg}
        </p>
      )}

      {focused && hints.length > 0 && (
        <ul className="flex flex-col">
          {hints.map((h) => (
            <AiReviewHintRow
              key={h.id}
              hint={h}
              onJumpToSubtask={onJumpToSubtask}
              onFill={(text) => setAdjustment(text)}
              onDismiss={() => setDismissed((d) => [...d, h.id])}
            />
          ))}
        </ul>
      )}

      {done && focused && (
        <AiEntryDetail
          entry={focused}
          adjustment={adjustment}
          onAdjustmentChange={setAdjustment}
          onRegen={(id, text) => { setAdjustment(""); regenAnalysis(id, text); }}
          onRemove={removeEntry}
          onToggleSubtask={onToggleSubtask}
          onJumpToSubtask={onJumpToSubtask}
        />
      )}

      {!focused && <AiIdleHint />}
    </div>
  );
}
