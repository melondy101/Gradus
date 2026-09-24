"use client";

/**
 * AI 卡内的任务切换标签（多任务并行分析时出现在 <AiInspector> 顶部）。
 * 选中态用点缀黄描边 + 14% 黄底，未选中退到深底描边 —— 与流水线节点同一语言。
 */

import { cn } from "@/utils/utils";

interface Props {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function AiEntryTab({ label, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "max-w-[150px] cursor-pointer rounded-pill border px-[9px] py-1 text-left",
        "font-mono text-micro tracking-[.05em] transition-[background-color,border-color,color] duration-150",
        "truncate overflow-hidden whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-bd-dark bg-transparent text-on-dark-2 hover:border-on-dark-3 hover:text-on-dark"
      )}
    >
      {label}
    </button>
  );
}
