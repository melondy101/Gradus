"use client";

import { cn } from "@/utils/utils";
import type { SubtaskState } from "./subtask-view-model";

interface GanttKeyProps {
  state: SubtaskState;
}

/**
 * 图例色块（§3 屏二 `.k`）：12×8、圆角 3，与甘特条共用三态色彩，
 * 但计划中只画描边、不铺半透明白，避免在图例里变成一个「空心方块」。
 */
export function GanttKey({ state }: GanttKeyProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "block h-[8px] w-[12px] shrink-0 rounded-[3px]",
        state === "done" && "bg-gantt-done",
        state === "live" && "bg-accent",
        state === "plan" && "hairline border-dashed border-bd-check bg-transparent"
      )}
    />
  );
}
