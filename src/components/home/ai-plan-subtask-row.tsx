"use client";

/**
 * AI 深底卡里的计划预览行（§3 屏一右列 / 屏三「计划预览」，原 app.css 深色态的
 * `.sub` + `.box`）。三态语言与 <SubtaskLine> 一致，只是配色反推：
 * 完成 = 奶油底 + 墨色勾（深卡上的「已盖章」），未完成 = 深底描边空框。
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
    <li className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-bd-dark py-[9px] first:border-t-0 first:pt-0">
      <CheckBox
        state={completed ? "done" : "todo"}
        aria-label={completed ? "取消完成" : "标记完成"}
        onClick={onToggle}
        className={cn(
          "bg-transparent",
          completed ? "border-on-dark bg-on-dark [&_span]:text-ink" : "border-bd-dark"
        )}
      />

      <div className="min-w-0">
        <b
          className={cn(
            "block overflow-hidden text-ellipsis text-[14.5px] leading-[1.4] font-bold whitespace-nowrap",
            completed ? "text-on-dark-3 line-through" : "text-on-dark"
          )}
        >
          {title}
        </b>
        {description && <p className="mt-0.5 text-[12px] text-on-dark-2">{description}</p>}
      </div>

      <Mono className="text-[10px] whitespace-nowrap text-right text-on-dark-3">
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
