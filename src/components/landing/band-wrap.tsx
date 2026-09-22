import { cn } from "@/utils/utils";

/**
 * 落地页版心（原 `.lp-wrap`）：设计基准 1440px，正文列宽
 * `min(1200px, 100% - 80px)`；680px 以下收为 `calc(100% - 44px)`
 * （原 `@media (max-width:680px)` 给导航与版心的 22px 安全边距）。
 *
 * 这份类串同时被 <section>（Hero / 最终 CTA）与 <nav> 的内层直接复用，故导出。
 */
export const wrapClass =
  "mx-auto w-[calc(100%_-_44px)] min-[680px]:w-[min(1200px,100%_-_80px)]";

/** 版心的三种栅格布局 */
const LAYOUT = {
  /** 单列 */
  base: "",
  /** 左文 + 右 400px 深色卡（原 `.lp-wrap--split`，1180px 以下堆叠） */
  split:
    "grid grid-cols-1 items-start gap-10 min-[1180px]:grid-cols-[1fr_400px] min-[1180px]:gap-[72px]",
  /** 品牌列 380px + 链接列（原 `.lp-wrap--foot`） */
  foot:
    "grid grid-cols-1 gap-12 pb-14 min-[1180px]:grid-cols-[380px_1fr] min-[1180px]:gap-[72px]",
} as const;

export interface BandWrapProps extends React.ComponentProps<"div"> {
  layout?: keyof typeof LAYOUT;
}

export function BandWrap({
  layout = "base",
  className,
  children,
  ...props
}: BandWrapProps) {
  return (
    <div className={cn(wrapClass, LAYOUT[layout], className)} {...props}>
      {children}
    </div>
  );
}
