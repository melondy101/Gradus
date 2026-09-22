"use client";

/**
 * 认知阶梯微缩图（§1.2 暖灰六级台阶 → 顶点黄）。
 *
 * size="sm" 是卡片右侧的 48×22 攀登指示；md/lg 交给 <BloomStaircasePanel>
 * 展开为带计数与图例的完整面板（单文件单组件，AGENTS.md §13）。
 * 台阶高度是固定的六级比例，用静态类名表而非内联 style，保证 Tailwind 能扫描到。
 */

import { cn } from "@/utils/utils";
import { computeBloomSteps } from "./bloom-steps";
import { BLOOM_BG_CLASS } from "./task-accent";
import { BloomStaircasePanel } from "./bloom-staircase-panel";

/** 25% → 100% 等差递高（L1 最矮、L6 满高） */
const HEIGHT_SM = ["h-[25%]", "h-[40%]", "h-[55%]", "h-[70%]", "h-[85%]", "h-full"];

interface BloomStaircaseProps {
  levels: number[];
  completed: boolean[];
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onStepClick?: (level: number) => void;
}

export function BloomStaircase({
  levels,
  completed,
  size = "sm",
  interactive = false,
  onStepClick,
}: BloomStaircaseProps) {
  const steps = computeBloomSteps(levels, completed);

  if (size !== "sm") {
    return (
      <BloomStaircasePanel
        steps={steps}
        size={size}
        interactive={interactive}
        onStepClick={onStepClick}
        doneTotal={completed.filter(Boolean).length}
        levelTotal={levels.length}
      />
    );
  }

  return (
    <div
      className="flex h-[22px] w-12 items-end gap-[3px]"
      title="认知攀登阶梯 (Bloom's Taxonomy)"
    >
      {steps.map((st, i) => (
        <div
          key={st.level}
          className={cn(
            HEIGHT_SM[i],
            "flex-1 rounded-[2px] transition-all duration-200",
            st.done > 0 && BLOOM_BG_CLASS[st.level],
            st.hasTasks && st.done === 0 && "border border-bd-card bg-cream-light",
            !st.hasTasks && "bg-transparent opacity-20"
          )}
        />
      ))}
    </div>
  );
}
