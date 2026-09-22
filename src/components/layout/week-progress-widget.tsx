"use client";

import React from "react";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { ProgressBar } from "@/components/task/progress-bar";
import type { WeekProgressModel } from "./week-progress";

interface WeekProgressWidgetProps {
  model: WeekProgressModel;
}

/**
 * 侧边栏「本周进度」部件（§3 共用外壳的 `.side__widget` 语言：
 * 12px 圆角描边卡 + 浅奶油底 + 6px 黄色进度条）。
 * 全部数值来自 computeWeekProgress()，为空时走今日口径，不含任何占位假数据。
 */
export function WeekProgressWidget({ model }: WeekProgressWidgetProps) {
  return (
    <div className="mt-[22px] rounded-field border border-bd-card bg-cream-light p-4">
      <Eyebrow kind="label">本周进度</Eyebrow>
      <ProgressBar
        percent={model.percent}
        label="本周学习进度"
        className="h-1.5 rounded-[3px] border-0 bg-bd-card"
        barClassName="rounded-[3px]"
      />
      <p className="mt-[9px] text-[12px] text-text-2">
        <b className="text-[15px] font-black text-ink">{model.value}</b>
        {model.unit}
      </p>
      <Mono className="mt-1 block text-[9.5px] text-text-3">{model.caption}</Mono>
    </div>
  );
}
