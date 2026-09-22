"use client";

import { cn } from "@/utils/utils";
import type { SubtaskState } from "./subtask-view-model";

interface SubtaskMarkProps {
  state: SubtaskState;
  /** 计划中的序号占位（设计稿 `.mk--plan` 显示点位） */
  n?: number | string;
  /** 传入即渲染为可点击的勾选控件，否则为装饰性标记 */
  onToggle?: () => void;
  title?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

/**
 * 屏二子任务清单的圆形三态标记（§3 屏二 `.mk`）：
 * 已完成＝墨底反白勾 / 进行中＝黄描边 + 8px 黄点 / 计划中＝细描边空心。
 * 与 <CheckBox>（方形复选框）、<Badge>（状态徽章）共用同一套状态语言。
 */
export function SubtaskMark({
  state,
  n,
  onToggle,
  title,
  ariaLabel,
  children,
}: SubtaskMarkProps) {
  const className = cn(
    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black",
    state === "done" && "bg-ink text-cream",
    state === "live" && "border-2 border-accent bg-white text-ink",
    state === "plan" && "hairline border-bd-check bg-white text-text-3",
  );

  // 进行中：黄点（`.mk--live::after`）；已完成：调用方传入的勾图标，缺省回落 ✓
  const inner =
    state === "live" ? (
      <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
    ) : state === "done" ? (
      (children ?? "✓")
    ) : (
      (n ?? null)
    );

  if (!onToggle) {
    return (
      <span aria-hidden className={className} title={title}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "done"}
      aria-label={ariaLabel}
      title={title}
      onClick={onToggle}
      className={cn(className, "transition-transform duration-[.12s] active:scale-90")}
    >
      {inner}
    </button>
  );
}
