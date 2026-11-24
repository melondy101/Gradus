"use client";

/**
 * AI 面板里的计划预览行（§3 屏一右列 / 屏三「计划预览」，原 app.css 的
 * `.sub` + `.box` → 暖纸底）。三态语言与 <SubtaskLine> 一致：
 * 完成 = 墨底方勾（「已盖章」），未完成 = 墨框空框。
 *
 * ⚠ 勾选走真实的 PATCH（onToggleSubtask），跳转依赖 #subtask-card-{id}。
 */

import { CheckBox } from "@/components/ui/check-box";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

interface Props {
  title: string;
  description?: string | null;
  completed: boolean;
  bloomLevel: number;
  durationDays: number;
  onToggle: () => void;
  onJump?: () => void;
}

export function AiPlanSubtaskRow({
  title, description, completed, bloomLevel, durationDays, onToggle, onJump,
}: Props) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-bd-card py-2 first:border-t-0 first:pt-0">
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
            completed ? "text-text-3 line-through" : "text-ink"
          )}
        >
          {title}
        </b>
        {description && <p className="mt-0.5 text-body-sm text-text-2">{description}</p>}
      </div>

      <Mono className="text-micro whitespace-nowrap text-right text-text-3">
        <button
          type="button"
          onClick={onJump}
          className="cursor-pointer bg-transparent font-[inherit] tracking-[inherit] text-inherit"
        >
          L{bloomLevel} · {durationDays} 天
        </button>
      </Mono>
    </li>
  );
}
