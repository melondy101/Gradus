"use client";

/**
 * AI 面板内的任务切换标签（多任务并行分析时出现在 <AiInspector> 顶部）。
 * 选中态用墨框 + 墨底反白（与天梯台阶 / 计划卡的选中语言一致），
 * 未选中退到暖纸描边 —— 与流水线节点同一语言。
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
        "max-w-[150px] cursor-pointer rounded-field border px-2 py-1 text-left",
        "font-mono text-micro tracking-[.05em] transition-[background-color,border-color,color] duration-150",
        "truncate overflow-hidden whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        active
          ? "border-ink bg-ink text-cream"
          : "border-bd-check bg-transparent text-text-2 hover:border-ink hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}
