"use client";

import { bloomChromatic } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

interface GanttKeyProps {
  /** 认知层级：图例色块颜色 = 层级色（时间色谱） */
  level: number;
}

/**
 * 层级图例色块（时间色谱）：12×8、圆角 3，颜色与甘特条、认知色轨同源。
 * 旧版是三态色块（灰/黄/描边），现在只讲「颜色 = 认知层级」这一件事。
 */
export function GanttKey({ level }: GanttKeyProps) {
  return (
    <span
      aria-hidden
      className={cn("block h-[8px] w-[12px] shrink-0 rounded-[3px]")}
      style={{ background: bloomChromatic(level) }}
    />
  );
}
