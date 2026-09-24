"use client";

import { cn } from "@/utils/utils";

interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  /** 无障碍名称，进度条本身没有文本 */
  label: string;
  className?: string;
  /** 填充条类名（侧栏用同一形状但无描边底） */
  barClassName?: string;
}

/**
 * 黄色进度条 —— §3 屏二 `.prog__bar` 与侧栏 `.side__bar` 共用同一形状：
 * 8px 高 / 4px 圆角 / 细描边浅底，填充为点缀黄，宽度过渡 .5s。
 */
export function ProgressBar({ percent, label, className, barClassName }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn(
        "h-2 overflow-hidden rounded-chip-sm border border-bd-card bg-cream",
        className
      )}
    >
      <span
        style={{ width: `${clamped}%` }}
        className={cn(
          "block h-full rounded-chip-sm bg-accent transition-[width] duration-500 ease-[cubic-bezier(.4,0,.2,1)]",
          barClassName
        )}
      />
    </div>
  );
}
