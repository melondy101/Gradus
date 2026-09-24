"use client";

/**
 * 流水线单节点 + 右侧连接线（§3 屏幕三 `.pnode` / `.pline`）。
 *
 * 圆圈几何：36px 正圆、等宽 13px 序号；
 *   done → 墨底反白；live → 点缀黄实心 + 5px rgba(245,197,24,.2) 光晕；idle → 描边圈。
 *   深色 AI 卡里的 idle 改透明底 + 深底描边，避免白圈落在深底上。
 * 连接线上的「正在填充」动画用 after: 伪元素 utility 表达，不新增 CSS。
 */

import { cn } from "@/utils/utils";
import { Mono } from "@/components/ui/eyebrow";

export type PipelineState = "idle" | "live" | "done";
export type PipelineTone = "light" | "dark";
/** sm = 62px（移动抽屉）· md = 68px（380 卡 / 350 右栏）· lg = 96px（设计稿默认） */
export type PipelineSize = "sm" | "md" | "lg";

const NODE_WIDTH: Record<PipelineSize, string> = {
  sm: "w-[62px]",
  md: "w-[68px]",
  lg: "w-[96px]",
};

interface Props {
  state: PipelineState;
  tone: PipelineTone;
  size: PipelineSize;
  label: string;
  hint: string;
  /** 圆圈内内容：完成为 ✓ 图标，未完成为序号 */
  mark: React.ReactNode;
  /** 是否画右侧连接线（末节点不画） */
  hasLine?: boolean;
}

export function AiPipelineNode({ state, tone, size, label, hint, mark, hasLine = true }: Props) {
  const dark = tone === "dark";

  return (
    <>
      <div className={cn("flex flex-none flex-col items-center gap-1.5 text-center", NODE_WIDTH[size])}>
        <i
          className={cn(
            "grid size-9 place-items-center rounded-full hairline font-mono text-body font-bold",
            "transition-[background-color,border-color,color,box-shadow] duration-300",
            state === "done" && "border-ink bg-ink text-cream",
            state === "live" && "border-accent bg-accent text-ink ring-[5px] ring-[rgba(245,197,24,.2)]",
            state === "idle" &&
              (dark
                ? "border-bd-dark bg-transparent text-on-dark-3"
                : "border-bd-check bg-white text-text-3")
          )}
        >
          {mark}
        </i>
        <b
          className={cn(
            "text-body-sm font-bold transition-colors duration-300",
            size !== "lg" && "text-caption",
            state === "idle" ? (dark ? "text-on-dark-3" : "text-text-3") : "text-ink"
          )}
        >
          {label}
        </b>
        <Mono className={cn("text-[9px] font-normal tracking-normal", dark ? "text-on-dark-3" : "text-text-3")}>
          {hint}
        </Mono>
      </div>

      {hasLine && (
        <div
          className={cn(
            "relative mt-[17px] h-[1.5px] min-w-3 flex-1 overflow-hidden",
            state === "done" ? "bg-ink" : dark ? "bg-bd-dark" : "bg-bd-card",
            state === "live" &&
              "after:absolute after:inset-0 after:bg-accent after:content-[''] after:animate-[fill_1.6s_ease-in-out_infinite]"
          )}
        />
      )}
    </>
  );
}
