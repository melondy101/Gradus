import { cn } from "@/utils/utils"

/**
 * 标题阶梯 —— 设计说明 §1.3。
 * 黄色句号 `.dot-accent` 是全站唯一点缀规则之一，通过 accentDot 开启，
 * 只允许出现在 Hero 与章节大标题上。
 *
 * 衬线（font-chromatic）：时间色谱重构后，全站标题统一走「书卷气衬线」——
 * 应用内的今日路线 / 拾级天梯 / 接续排期 / 计划库 / 任务详情，与落地页
 * 用的是同一套标题语言。落地页原先仍是无衬线，视觉上像两个产品。
 */
const specs = {
  hero: "font-chromatic text-[38px] leading-[46px] font-black tracking-[-.01em] sm:text-[64px] sm:leading-[74px]",
  sec: "font-chromatic text-[28px] leading-[38px] font-bold tracking-[-.005em] sm:text-[44px] sm:leading-[56px]",
  sub: "font-chromatic text-[28px] leading-[38px] font-bold",
  page: "font-chromatic text-[26px] leading-[34px] font-black tracking-[-.01em]",
} as const

const dotSizes = {
  hero: "h-[12px] w-[12px] sm:h-[18px] sm:w-[18px]",
  sec: "h-[12px] w-[12px] sm:h-[18px] sm:w-[18px]",
  sub: "h-[11px] w-[11px]",
  page: "h-[11px] w-[11px]",
} as const

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "level"> {
  level?: 1 | 2 | 3
  spec?: keyof typeof specs
  accentDot?: boolean
}

export function Heading({
  level = 2,
  spec = "sec",
  accentDot = false,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as "h1"
  return (
    <Tag className={cn(specs[spec], className)} {...props}>
      {children}
      {accentDot ? (
        <span
          aria-hidden="true"
          className={cn(
            "ml-1 inline-block rounded-full bg-accent align-[-.02em]",
            dotSizes[spec]
          )}
        />
      ) : null}
    </Tag>
  );
}
