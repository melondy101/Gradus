"use client";

/**
 * 天梯单层台阶（?view=steps）—— 容器走 <Card> 原子件，选中态直接用
 * BLOOM_CONFIG 的层级令牌色（var(--bloom-N)），不再各写内联样式。
 */
import { T } from "@/lib/design-tokens";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/badge";
import { cn } from "@/utils/utils";

interface Props {
  level: number;
  name: string;
  nameEn: string;
  /** var() 形态的层级色，与 BLOOM_CONFIG 同源 */
  color: string;
  bg: string;
  border: string;
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
  color,
  bg,
  border,
  completedCount,
  totalCount,
  pct,
  selected,
  onToggleSelect,
}: Props) {
  const isFinished = totalCount > 0 && completedCount === totalCount;
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`筛选阶梯 ${level} ${name}`}
      onClick={onToggleSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onToggleSelect();
        }
      }}
      style={selected ? { background: bg, borderColor: color } : undefined}
      className={cn(
        "cursor-pointer gap-2 p-3.5 transition-[border-color,box-shadow,transform] duration-[.15s] ease-out",
        "hover:-translate-y-px hover:border-bd-check hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      )}
    >
      <div className="flex items-center justify-between">
        <Tag
          className="bg-transparent"
          style={{ background: bg, borderColor: border, color: "var(--bloom-5)" }}
        >
          阶 {level}
        </Tag>
        <span className="font-mono text-caption text-text-2">
          {completedCount}/{totalCount}
        </span>
      </div>

      <div>
        <div className="text-[14px] font-bold text-ink">{name}</div>
        <div className="text-caption text-text-2">{nameEn}</div>
      </div>

      {/* 台阶微型进度条 */}
      <div
        className="h-1 overflow-hidden rounded-full"
        style={{ background: T.soft }}
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full transition-[width] duration-[.4s] ease-out"
          style={{ width: `${Math.round(pct * 100)}%`, background: color }}
        />
      </div>

      {isFinished && (
        <div className="flex items-center gap-[3px] text-micro font-semibold text-success">
          ✓ 阶梯通关
        </div>
      )}
    </Card>
  );
}
