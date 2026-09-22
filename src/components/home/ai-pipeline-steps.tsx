"use client";

/**
 * 四阶段流水线（《品牌与产品设计说明》§3 屏三：意图解析 → 资源检索 → 计划生成 → 核查修订）。
 * 步骤状态完全由 useAnalysisPanel 的 stream.phase 推导，不编造进度数值。
 */

import { Check, X } from "lucide-react";
import { Mono } from "@/components/ui/eyebrow";
import { AiPipelineNode, type PipelineSize, type PipelineState, type PipelineTone } from "./ai-pipeline-node";
import {
  PIPELINE_STAGES,
  getEtaLabel,
  stageIndexOf,
  type StreamState,
} from "./use-analysis-panel";

interface Props {
  stream: StreamState;
  /** dark = 深色 AI 卡内使用（未激活节点改描边圈，避免白圈落在深底上） */
  tone?: PipelineTone;
  /** 节点宽度档位：窄容器（380px AI 卡 / 350px 右栏）用 md，移动抽屉用 sm */
  size?: PipelineSize;
}

export function AiPipelineSteps({ stream, tone = "light", size = "lg" }: Props) {
  const stageIdx = stageIndexOf(stream.phase);
  const isError = stream.phase === "error";
  const finished = stream.phase === "done";
  const eta = getEtaLabel(stream.phase, stream.deltaLen);

  return (
    <div className="mb-3 flex items-center gap-0">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = isError ? false : stageIdx > i || finished;
        const live = !isError && !finished && stageIdx === i;
        const state: PipelineState = done ? "done" : live ? "live" : "idle";
        return (
          <AiPipelineNode
            key={stage.key}
            state={state}
            tone={tone}
            size={size}
            label={stage.label}
            hint={stage.hint}
            mark={done ? <Check size={14} strokeWidth={3} /> : i + 1}
          />
        );
      })}

      {isError ? (
        <Mono className="flex flex-none items-center gap-1 text-error">
          <X size={12} /> 分析失败
        </Mono>
      ) : finished ? (
        <Mono className="flex flex-none text-accent">
          <Check size={12} className="inline align-[-2px]" /> 4 / 4
        </Mono>
      ) : (
        <Mono className="flex-none text-accent">{eta ?? `${stream.deltaLen}s`}</Mono>
      )}
    </div>
  );
}
