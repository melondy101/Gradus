"use client";

import { cn } from "@/utils/utils";
import type { NodeState } from "./ritual-phases";

interface PipelineNodeProps {
  /** 1 起的序号，已完成时改画勾 */
  index: number;
  state: NodeState;
  name: string;
  /** 节点下的等宽眉题，如 STAGE 1 */
  eyebrow: string;
}

/**
 * AI 规划流水线节点（§3 屏三 `.pnode`）：36px 圆心 + 阶段名 + 等宽眉题。
 * 三态与设计稿一致：已完成墨底反白 / 进行中黄底 + 5px 黄色光晕 / 待办细描边。
 */
export function PipelineNode({ index, state, name, eyebrow }: PipelineNodeProps) {
  return (
    <div className="flex w-[96px] shrink-0 flex-col items-center gap-1.5 text-center">
      <i
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full hairline font-mono text-[13px] font-bold not-italic",
          "transition-[background-color,border-color,color,box-shadow] duration-300 ease-out",
          state === "todo" && "border-bd-check bg-white text-text-3",
          state === "done" && "border-ink bg-ink text-cream",
          state === "live" &&
            "border-accent bg-accent text-ink shadow-[0_0_0_5px_rgba(245,197,24,.2)]"
        )}
      >
        {state === "done" ? "✓" : index}
      </i>
      <b
        className={cn(
          "text-[12.5px] font-bold transition-colors duration-300",
          state === "todo" ? "text-text-3" : "text-ink"
        )}
      >
        {name}
      </b>
      <span className="font-mono text-[9px] font-medium tracking-[.05em] text-text-3">
        {eyebrow}
      </span>
    </div>
  );
}
