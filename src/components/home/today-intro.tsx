"use client";

/**
 * 今日路线 · 左栏（对照 `design-demos/time-chromatics/today.html` 的 `.intro`）
 *
 * 结构：眉题 → 衬线大标题（「色」字朱红）→ 导语 → 三格真实统计 → 今日认知色谱 → 新目标表单。
 * 统计全部来自 /api/user/stats 与今日时间桶，不写占位数字。
 */

import { T } from "@/lib/design-tokens";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { AchievementPanel } from "./achievement-panel";
import { GoalCard } from "./goal-card";
import { PlanSpectrum } from "./plan-spectrum";
import type { TodayMetrics } from "./today-metrics";
import type { UserStats } from "./use-user-stats";

interface Props {
  stats: UserStats | null;
  metrics: TodayMetrics;
  narrow: boolean;
  onNewGoal: (goal: string) => void;
  onOpenDialog: (goal: string) => void;
}

export function TodayIntro({ stats, metrics, narrow, onNewGoal, onOpenDialog }: Props) {
  return (
    <section
      className="flex flex-col border-b border-bd-card px-6 py-6 lg:border-r lg:border-b-0 lg:px-6 lg:py-6"
      style={{ background: T.bg }}
    >
      <div>
        <Eyebrow>A DAY HAS ITS OWN COLOR</Eyebrow>
        <h1
          className={cn(
            "mt-4 font-chromatic leading-[1.12] tracking-[-.03em] text-ink",
            narrow ? "text-display-sm" : "text-display"
          )}
        >
          今天的每一件，
          <br />
          都有它的<span className="text-error">色。</span>
        </h1>
        <p className="mt-4 max-w-[34ch] font-chromatic text-body leading-relaxed text-text-2">
          给每一种认知状态一种颜色。看见今天的节奏，也知道完成之后该往哪里去。
        </p>
      </div>

      {stats && <AchievementPanel stats={stats} metrics={metrics} />}

      <div className="mt-6 max-w-[260px]">
        <PlanSpectrum />
        <div className="mt-2 flex justify-between font-mono text-micro tracking-[.16em] text-text-3">
          <span>L1</span>
          <span>L6</span>
        </div>
      </div>

      <GoalCard onSubmit={onNewGoal} onOpenDialog={onOpenDialog} />
    </section>
  );
}
