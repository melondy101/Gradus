"use client";

/**
 * 按键指示 —— 白底细描边的小等宽方块（§1.4 输入语言的微缩版）。
 * 供时间轴状态条、底部快捷键条与指令面板共用。
 */

import { cn } from "@/utils/utils";

export function Kbd({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "rounded-chip-sm border border-bd-card bg-white px-1 font-mono text-[9px] leading-[1.5] text-text-2",
        className
      )}
    >
      {children}
    </kbd>
  );
}
