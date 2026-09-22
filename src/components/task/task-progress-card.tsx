"use client";

import { Card } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { ProgressBar } from "./progress-bar";
import type { SubtaskState } from "./subtask-view-model";

interface TaskProgressCardProps {
  completedCount: number;
  states: Record<SubtaskState, number>;
  total: number;
  /** 0–100 */
  pct: number;
  remainingDays: number;
}

/**
 * 屏二总体进度卡（§3 屏幕二）：左为标签与真实计数，中为点缀黄进度条，
 * 右为 26px 百分比。三列栅格 minmax(0,230px) / 1fr / auto。
 */
export function TaskProgressCard({
  completedCount,
  states,
  total,
  pct,
  remainingDays,
}: TaskProgressCardProps) {
  const detail = [
    `${states.done} 已完成`,
    `${states.live} 进行中`,
    `${states.plan} 计划中`,
  ];
  if (remainingDays > 0) detail.push(`剩余 ${remainingDays} 天`);

  return (
    <Card className="gap-0">
      <div className="grid grid-cols-[minmax(0,230px)_minmax(0,1fr)_auto] items-center gap-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">总体进度</h3>
          <Mono className="mt-1 block text-[10px] text-text-3">
            {detail.join(" · ")}
            {total > 0 ? ` · 共 ${total} 个子任务` : ""}
          </Mono>
        </div>
        <ProgressBar percent={completedCount > 0 ? pct : 0} label="总体完成度" />
        <b className="text-[26px] leading-none font-black">{pct}%</b>
      </div>
    </Card>
  );
}
