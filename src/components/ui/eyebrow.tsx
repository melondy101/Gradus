import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/utils";

/**
 * 眉题族 —— 设计说明 §1.3：等宽小字 + 全大写 + 宽字距。
 * 全站所有「标题上方的小字」都走这里，不允许再手写 letter-spacing。
 */
const eyebrowVariants = cva(
  "font-mono uppercase text-text-3",
  {
    variants: {
      kind: {
        /** 章节眉题：11px / 700 / .16em */
        eyebrow: "text-caption font-bold tracking-[.16em]",
        /** 卡片内标签：10px / 700 / .16em，自带下间距 */
        label: "block text-micro font-bold tracking-[.16em] mb-[10px]",
        /** 行内元信息：11px / 500 / .05em，不强制大写 */
        meta: "text-caption font-medium tracking-[.05em] normal-case",
      },
      tone: {
        base: "",
        /** 深底上的强调黄 —— AI 模块的统一语言 */
        accent: "text-accent",
        muted: "text-text-2",
      },
    },
    defaultVariants: { kind: "eyebrow", tone: "base" },
  }
);

export interface EyebrowProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof eyebrowVariants> {}

export function Eyebrow({ className, kind, tone, ...props }: EyebrowProps) {
  return (
    <p className={cn(eyebrowVariants({ kind, tone }), className)} {...props} />
  );
}

/** `.mono` 的行内版本：数字、日期、代码片段 */
export function Mono({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "font-mono text-caption font-medium tracking-[.05em]",
        className
      )}
      {...props}
    />
  );
}
