"use client";

import type { CSSProperties } from "react";
import { T, bloomChromatic } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

interface GanttBarProps {
  /** 认知层级：色条颜色 = 层级色（时间色谱） */
  level: number;
  /** 是否已完成（条内打勾，状态不再靠颜色区分） */
  done?: boolean;
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
 * 甘特条形 —— 时间色谱：颜色 = 认知层级，完成与否靠条内的 ✓ 区分。
 *
 * 旧版是「灰＝已完成 / 黄＝进行中 / 描边＝计划中」三态，与接续排期视图
 * （色条颜色对应认知层级）对不上；现在两个视图用同一套语义。
 * 金 / 赭两级底色偏亮，用墨字才读得清。
 */
export function GanttBar({
  level,
  done = false,
  col,
  count,
  title,
  animated = false,
  delaySec = 0,
}: GanttBarProps) {
  const lightBar = level === 2 || level === 3;
  return (
    <span
      title={title}
      style={
        {
          "--s": col,
          "--c": count,
          transformOrigin: "left",
          background: bloomChromatic(level),
          color: lightBar ? T.ink : T.bg,
          animation: animated
            ? `ganttGrow .55s cubic-bezier(.2,.8,.2,1) ${delaySec}s both`
            : undefined,
        } as CSSProperties
      }
      className={cn(
        "flex h-[21px] items-center gap-1 overflow-hidden rounded-tag px-1.5 [grid-column:var(--s)/span_var(--c)]",
        "text-micro font-bold whitespace-nowrap transition-[transform,filter] duration-[.16s] ease-out",
        "hover:scale-y-[1.12] hover:brightness-[1.04]",
      )}
    >
      {done && <span aria-hidden="true">✓</span>}
    </span>
  );
}
