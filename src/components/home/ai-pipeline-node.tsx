"use client";

/**
 * 流水线单节点 + 右侧连接线（§3 屏幕三 `.pnode` / `.pline`）。
 *
 * 圆圈几何：36px 正圆、等宽 13px 序号；
 *   done → 墨底反白；live → 点缀黄实心 + 5px rgba(245,197,24,.2) 光晕；idle → 描边圈。
 * 深色 tone 已随时间色谱重构（AI 面板转暖纸底）删除，节点只在浅底出现。
 * 连接线上的「正在填充」动画用 after: 伪元素 utility 表达，不新增 CSS。
 */

import { cn } from "@/utils/utils";
import { Mono } from "@/components/ui/eyebrow";

export type PipelineState = "idle" | "live" | "done";
/** sm = 62px（移动抽屉）· md = 68px（380 卡 / 350 右栏）· lg = 96px（设计稿默认） */
export type PipelineSize = "sm" | "md" | "lg";

const NODE_WIDTH: Record<PipelineSize, string> = {
  sm: "w-[62px]",
  md: "w-[68px]",
  lg: "w-[96px]",
};

interface Props {
  state: PipelineState;
  size: PipelineSize;
  label: string;
  hint: string;
  /** 圆圈内内容：完成为 ✓ 图标，未完成为序号 */
  mark: React.ReactNode;
  /** 是否画右侧连接线（末节点不画） */
  hasLine?: boolean;
}

export function AiPipelineNode({ state, size, label, hint, mark, hasLine = true }: Props) {
  return (
    <>
      <div className={cn("flex flex-none flex-col items-center gap-1.5 text-center", NODE_WIDTH[size])}>
        <i
          className={cn(
            "grid size-9 place-items-center rounded-full hairline font-mono text-body font-bold",
            "transition-[background-color,border-color,color,box-shadow] duration-300",
            state === "done" && "border-ink bg-ink text-cream",
            state === "live" && "border-accent bg-accent text-ink ring-[5px] ring-accent-soft",
            state === "idle" && "border-bd-check bg-card text-text-3"
          )}
        >
          {mark}
        </i>
        <b
          className={cn(
            "text-body-sm font-bold transition-colors duration-300",
            size !== "lg" && "text-caption",
            state === "idle" ? "text-text-3" : "text-ink"
          )}
        >
          {label}
        </b>
        <Mono className={cn("text-2xs font-normal tracking-normal text-text-3")}>
          {hint}
        </Mono>
      </div>

      {hasLine && (
        <div
          className={cn(
            "relative mt-4 h-[1.5px] min-w-3 flex-1 overflow-hidden",
            state === "done" ? "bg-ink" : "bg-bd-card",
            state === "live" &&
              "after:absolute after:inset-0 after:bg-accent after:content-[''] after:animate-[fill_1.6s_ease-in-out_infinite]"
          )}
        />
      )}
    </>
  );
}
