import { cn } from "@/utils/utils";

/** 章节色带底色（原 `.lp-band` / `.lp-band--light` / `.lp-band--dark`） */
const TONE = {
  base: "bg-cream text-ink",
  light: "bg-cream-light text-ink",
  dark: "bg-band-dark text-on-dark",
} as const;

export interface BandProps extends React.ComponentProps<"section"> {
  tone?: keyof typeof TONE;
}

/**
 * 章节大标题的间距与字号（原 `.lp-band .h-sec{margin:12px 0 44px}` +
 * `.h-sec.sm{font-size:40px;line-height:50px}`）；680px 以下回落 28/38 由
 * <Heading spec="sec"> 自带。
 */
export const bandHeadingClass = "mt-3 mb-11 sm:text-[40px] sm:leading-[50px]";

/**
 * Band —— 落地页章节色带外壳：
 * 上下内边距 100px（680px 以下 64px），底色三色交替 奶油 / 浅奶油 / 深色带。
 * 每段都带锚点 id 供导航定位，故固定 scroll-mt-20。
 */
export function Band({ tone = "base", className, children, ...props }: BandProps) {
  return (
    <section
      className={cn(
        "scroll-mt-20 py-16 min-[680px]:py-[100px]",
        TONE[tone],
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
