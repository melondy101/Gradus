"use client";

/**
 * 认知阶梯面板 —— <BloomStaircase> 的 md/lg 展开态：六级柱 + 每层完成计数 +
 * L1→L6 图例。柱体从该层令牌色渐隐到白卡底，表示「已达成」。
 */

import { cn } from "@/utils/utils";
import { Card } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { Tag } from "@/components/ui/badge";
import type { BloomStep } from "./bloom-steps";
import { BLOOM_BORDER_CLASS, BLOOM_STEP_GRADIENT } from "./task-accent";

/** 20% → 100% 等差递高 */
const HEIGHT = ["h-[20%]", "h-[36%]", "h-[52%]", "h-[68%]", "h-[84%]", "h-full"];

interface Props {
  steps: BloomStep[];
  size: "md" | "lg";
  interactive?: boolean;
  onStepClick?: (level: number) => void;
  doneTotal: number;
  levelTotal: number;
}

export function BloomStaircasePanel({
  steps,
  size,
  interactive = false,
  onStepClick,
  doneTotal,
  levelTotal,
}: Props) {
  return (
    <Card className={cn("gap-2", size === "lg" ? "p-4" : "p-3")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-ink">认知阶梯攀登</span>
          <Mono className="text-[11px] font-normal tracking-normal text-text-3">Bloom Ascent</Mono>
        </div>
        <Tag className="rounded-pill bg-accent-soft px-2 py-[2px] text-[11px] text-accent-ink">
          {doneTotal} / {levelTotal} 阶达成
        </Tag>
      </div>

      <div className={cn("flex items-end gap-1.5 py-1", size === "lg" ? "h-20" : "h-[54px]")}>
        {steps.map((st, i) => (
          <div
            key={st.level}
            onClick={() => interactive && onStepClick?.(st.level)}
            title={`${st.config.name} (${st.config.nameEn}): ${st.done}/${st.total} 完成`}
            className={cn(
              "flex flex-1 flex-col items-center justify-between rounded-t-[6px] rounded-b-[2px] px-0.5 py-1",
              "border transition-all duration-200 ease-[cubic-bezier(.16,1,.3,1)]",
              HEIGHT[i],
              interactive ? "cursor-pointer" : "cursor-default",
              st.hasTasks ? BLOOM_BORDER_CLASS[st.level] : "border-bd-card",
              st.done > 0
                ? BLOOM_STEP_GRADIENT[st.level]
                : st.hasTasks
                ? "bg-cream-light opacity-70"
                : "bg-cream-light opacity-25"
            )}
          >
            {st.hasTasks && (
              <Mono className={cn("text-[9px] font-bold", st.done > 0 ? "text-ink" : "text-text-3")}>
                {st.done}/{st.total}
              </Mono>
            )}
            <span className={cn("text-[10px] font-semibold", st.hasTasks ? "text-ink" : "text-text-3")}>
              L{st.level}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-1 text-[10px] text-text-3">
        <span>L1 识记 (基础)</span>
        <span>L6 创造 (精通)</span>
      </div>
    </Card>
  );
}
