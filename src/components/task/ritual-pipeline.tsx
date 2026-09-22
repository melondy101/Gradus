"use client";

import { Fragment } from "react";
import { lineState, nodeState, RITUAL_STAGES } from "./ritual-phases";
import { PipelineLine } from "./pipeline-line";
import { PipelineNode } from "./pipeline-node";

interface RitualPipelineProps {
  phase: string;
}

/**
 * 屏三四阶段流水线：勾选态 / 黄圈激活态 / 描边待办态全部由 `phase` 推导，
 * 连接线同理。节点与线是兄弟元素，故用 Fragment 平铺，不额外包容器。
 */
export function RitualPipeline({ phase }: RitualPipelineProps) {
  return (
    <div className="mb-3 flex items-start gap-0">
      {RITUAL_STAGES.map((stage, i) => (
        <Fragment key={stage.key}>
          <PipelineNode
            index={i + 1}
            state={nodeState(i, phase)}
            name={stage.name}
            eyebrow={stage.eyebrow}
          />
          {i < RITUAL_STAGES.length - 1 && (
            <PipelineLine state={lineState(i, phase)} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
