import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/utils";

/**
 * 状态徽章 —— 设计说明 §3 屏二详情面板。
 * 三态与复选框、甘特条共用同一语言：进行中黄 / 已完成墨 / 计划中描边。
 */
const badgeVariants = cva(
  "inline-flex items-center gap-[7px] self-start rounded-pill px-[11px] py-[5px] font-mono text-[10px] font-bold tracking-[.06em] whitespace-nowrap",
  {
    variants: {
      state: {
        live: "border border-accent-deep bg-accent-soft text-accent-ink",
        done: "border border-ink bg-ink text-cream",
        plan: "border border-bd-field bg-cream-light text-text-2",
      },
      /** 深色底（AI 卡、页脚）上的变体 */
      onDark: { true: "border-bd-dark bg-white/5 text-on-dark", false: "" },
    },
    defaultVariants: { state: "plan", onDark: false },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, state, onDark, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ state, onDark }), className)} {...props} />
  );
}

/** 极小等宽标签（Bloom 层级、时长、来源）—— §1.4 的 6px 圆角方角标签 */
export function Tag({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "rounded-[6px] border border-bd-card bg-cream px-[9px] py-[4px]",
        "font-mono text-[10px] font-bold tracking-[.06em] text-text-2 whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}
