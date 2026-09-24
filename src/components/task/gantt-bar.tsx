"use client";

import type { CSSProperties } from "react";
import { cn } from "@/utils/utils";
import type { SubtaskState } from "./subtask-view-model";

interface GanttBarProps {
  state: SubtaskState;
  /** 8 列网格中的起始列（1 起） */
  col: number;
  /** 跨列数 */
  count: number;
  title: string;
  /** 入场生长动画（屏一总览用，屏二静态渲染关闭） */
  animated?: boolean;
  /** 逐条延迟秒数 */
  delaySec?: number;
}

/**
 * 甘特条形 —— §3 屏二三态：灰＝已完成 / 黄＝进行中 / 描边＝计划中。
 * 落位仍用 `--s` / `--c` 两个自定义属性拼 grid-column，几何与设计稿一致
 * （高 21、圆角 6、悬停纵向抬升 1.12）。
 */
export function GanttBar({
  state,
  col,
  count,
  title,
  animated = false,
  delaySec = 0,
}: GanttBarProps) {
  return (
    <span
      title={title}
      style={
        {
          "--s": col,
          "--c": count,
          transformOrigin: "left",
          animation: animated
            ? `ganttGrow .55s cubic-bezier(.2,.8,.2,1) ${delaySec}s both`
            : undefined,
        } as CSSProperties
      }
      className={cn(
        "block h-[21px] rounded-tag [grid-column:var(--s)/span_var(--c)]",
        "transition-[transform,filter] duration-[.16s] ease-out",
        "hover:scale-y-[1.12] hover:brightness-[1.04]",
        state === "done" && "bg-gantt-done",
        state === "live" && "bg-accent shadow-[inset_0_0_0_1px_var(--accent-deep)]",
        state === "plan" &&
          "hairline border-dashed border-bd-check bg-[rgba(255,255,255,.5)]"
      )}
    />
  );
}
