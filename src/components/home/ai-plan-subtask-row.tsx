"use client";

/**
 * AI 面板里的计划预览行（时间色谱 · 与今日路线行同一套语言）。
 *
 * 之前这里只有一行灰字「L1 · 2 天」，没有层级色轨、没有彩色层级标签，
 * 和今日路线 / 天梯完全不像一套东西 —— 同一份计划在两个面板里长得不一样。
 * 现在对齐 <SubtaskLine>：8px 认知色轨 + 彩色 L 标签 + 每日工时。
 *
 * ⚠ 勾选走真实的 PATCH（onToggleSubtask），跳转依赖 #subtask-card-{id}。
 */

import { CheckBox } from "@/components/ui/check-box";
import { BLOOM_CONFIG, bloomChromatic } from "@/lib/design-tokens";
import { deepHoursOf } from "@/lib/workload";
import { cn } from "@/utils/utils";

interface Props {
  title: string;
  description?: string | null;
  completed: boolean;
  bloomLevel: number;
  durationDays: number;
  /** AI 给出的每日深度工时；缺失时按 1.5h/天 兜底 */
  deepWorkHours?: number | null;
  onToggle: () => void;
  onJump?: () => void;
}

export function AiPlanSubtaskRow({
  title, description, completed, bloomLevel, durationDays, deepWorkHours, onToggle, onJump,
}: Props) {
  const level = Math.min(6, Math.max(1, bloomLevel || 1));
  const config = BLOOM_CONFIG[level as keyof typeof BLOOM_CONFIG] ?? BLOOM_CONFIG[3];
  const color = bloomChromatic(level);
  const daily = deepHoursOf({ durationDays, deepWorkHours });

  return (
    <li className="grid grid-cols-[8px_22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-bd-card py-2.5 first:border-t-0 first:pt-0">
      <span className="h-10 w-2" style={{ background: color }} aria-hidden="true" />

      <CheckBox
        state={completed ? "done" : "todo"}
        aria-label={completed ? "取消完成" : "标记完成"}
        onClick={onToggle}
        className={cn("bg-transparent", completed ? "border-ink bg-ink" : "border-ink")}
      />

      <div className="min-w-0">
        <b
          className={cn(
            "block overflow-hidden text-ellipsis text-body-lg leading-[1.4] font-bold whitespace-nowrap",
            completed ? "text-text-3 line-through decoration-bd-check" : "text-ink"
          )}
        >
          {title}
        </b>
        {description && <p className="mt-0.5 text-body-sm text-text-2">{description}</p>}
      </div>

      <div className="text-right">
        <b className="block text-body-sm font-bold whitespace-nowrap" style={{ color }}>
          L{level} {config.name}
        </b>
        <button
          type="button"
          onClick={onJump}
          className="mt-0.5 block cursor-pointer bg-transparent font-mono text-2xs tracking-[.04em] whitespace-nowrap text-text-3 transition-colors hover:text-ink"
        >
          {durationDays} 天 · {daily.hours}h/天
        </button>
      </div>
    </li>
  );
}
