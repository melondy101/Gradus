import { cn } from "@/utils/utils";
import { Mono } from "./eyebrow";

/**
 * 悬浮 AI pill —— 设计说明 §4.5：AI 是产品的「第二主角」，
 * Landing Hero 与 App 屏二共用同一深色 pill 语言。
 * 定位交给调用方（App 内用 fixed，Hero 内用 absolute）。
 */
export interface AiPillProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  /** 形如「阶段 2/4」，等黄展示 */
  stage?: string;
  spinning?: boolean;
  /** 静态小圆点（无动画时的降级） */
  live?: boolean;
}

export function AiPill({
  className,
  label,
  stage,
  spinning = true,
  live = false,
  ...props
}: AiPillProps) {
  return (
    <div
      data-slot="ai-pill"
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-pill",
        "border border-bd-dark bg-band-dark px-[18px] py-3 pl-3.5",
        "text-[13px] font-bold text-on-dark",
        "shadow-[0_22px_46px_-18px_rgba(14,13,11,.55)]",
        className
      )}
      {...props}
    >
      {spinning ? (
        <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent [animation-duration:1.1s]" />
      ) : live ? (
        <span className="h-[7px] w-[7px] shrink-0 animate-pulse rounded-full bg-accent" />
      ) : null}
      <span>{label}</span>
      {stage ? <Mono className="ml-0.5 text-accent">{stage}</Mono> : null}
    </div>
  );
}
