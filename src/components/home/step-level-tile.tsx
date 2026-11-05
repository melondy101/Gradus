"use client";

/**
 * 天梯的一级台阶（对照 `steps.html` 的 `.level-card`）：
 * 顶部 8px 层级色、等宽层级编号、衬线台阶名、完成数与细进度条。
 * 选中态用墨框 + 3px 硬阴影，与计划卡的交互语言一致。
 */

import { bloomChromatic } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

interface Props {
  level: number;
  name: string;
  nameEn: string;
  completedCount: number;
  totalCount: number;
  pct: number;
  selected: boolean;
  onToggleSelect: () => void;
}

export function StepLevelTile({
  level,
  name,
  nameEn,
  completedCount,
  totalCount,
  pct,
  selected,
  onToggleSelect,
}: Props) {
  const color = bloomChromatic(level);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`筛选阶梯 ${level} ${name}`}
      onClick={onToggleSelect}
      style={{ borderTopColor: color }}
      className={cn(
        "min-h-[116px] cursor-pointer border border-bd-card border-t-8 bg-cream-light px-3 py-3 text-left",
        "transition-[border-color,box-shadow,transform] duration-[.16s] ease-out",
        selected
          ? "border-ink shadow-[3px_3px_0_var(--ink)]"
          : "hover:border-ink hover:shadow-[3px_3px_0_var(--bd-check)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      )}
    >
      <span className="font-mono text-micro tracking-[.16em] text-text-3">
        L{level} / {nameEn.toUpperCase()}
      </span>
      <h3 className="mt-2 font-chromatic text-title-sm leading-none text-ink">{name}</h3>
      <span className="mt-3 block text-body-sm text-text-2">
        {completedCount} / {totalCount} 完成
      </span>
      <span className="mt-2 block h-[3px] bg-bd-card" aria-hidden="true">
        <span
          className="block h-full transition-[width] duration-[.4s] ease-out"
          style={{ width: `${Math.round(pct * 100)}%`, background: color }}
        />
      </span>
    </button>
  );
}
