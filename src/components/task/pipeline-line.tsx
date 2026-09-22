"use client";

import { cn } from "@/utils/utils";
import type { NodeState } from "./ritual-phases";

interface PipelineLineProps {
  state: NodeState;
}

/**
 * 流水线节点间的连接线（§3 屏三 `.pline`）：1.5px 细线，与节点圆心同高。
 * 已完成整条转墨；进行中用点缀黄从左向右反复填充（复用 globals.css 的
 * stairGrow 关键帧，不再依赖 app.css 的 fill）。
 */
export function PipelineLine({ state }: PipelineLineProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative mt-[17px] h-[1.5px] flex-1 overflow-hidden bg-bd-card",
        state === "done" && "bg-ink"
      )}
    >
      {state === "live" && (
        <span className="absolute inset-0 origin-left animate-[stairGrow_1.6s_ease-in-out_infinite] bg-accent" />
      )}
    </span>
  );
}
