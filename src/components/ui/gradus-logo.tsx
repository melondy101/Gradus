import { T } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

interface GradusLogoProps {
  /** 标识总高度（px），默认 26（原型 .brand 的高度） */
  size?: number;
  className?: string;
  /** 是否带「拾级 + GRADUS」字标 */
  showText?: boolean;
  /** 字标类名（字号/颜色由调用方给） */
  textClassName?: string;
  /** 深色底反白：标识下两级改用反白，顶点仍是朱红 */
  onDark?: boolean;
}

/** 三级台阶的比例（原型 .brand i:nth-child）：8 / 17 / 26 */
const BAR_HEIGHTS = [8, 17, 26];
const BASE_HEIGHT = 26;
const BASE_WIDTH = 6;

/**
 * 拾级 Gradus 品牌标识（时间色谱）。
 *
 * 三级台阶：下两级墨色（深底反白）、顶点朱红 —— 与认知阶梯、时间色谱色板同一套语言。
 * 旧版是「黄色顶点的横向台阶块 + 无衬线字标」，只属于重构前的品牌，和应用内
 * 顶栏（三级竖条 + 衬线字标）对不上，等于两个 logo。
 *
 * 全站只有这一个品牌定义：落地页 nav / 页脚、应用内顶栏、独立路由品牌栏、
 * 达成弹窗与流水线弹层都用它。
 */
export function GradusLogo({
  size = 22,
  className,
  showText = false,
  textClassName,
  onDark = false,
}: GradusLogoProps) {
  const scale = size / BASE_HEIGHT;
  const width = Math.max(3, Math.round(BASE_WIDTH * scale));
  const base = onDark ? T.onDark : T.ink;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[9px] leading-none",
        className,
      )}
    >
      <span
        className="flex shrink-0 items-end gap-[2px]"
        style={{ height: size }}
        aria-hidden="true"
      >
        {BAR_HEIGHTS.map((h, i) => (
          <i
            key={i}
            className="block"
            style={{
              width,
              height: Math.round(h * scale),
              background: i === BAR_HEIGHTS.length - 1 ? T.error : base,
            }}
          />
        ))}
      </span>
      {showText ? (
        <span className={cn("flex items-baseline gap-[10px]", textClassName)}>
          <b className="font-chromatic text-title-sm font-extrabold tracking-[-.01em]">拾级</b>
          <span className="font-mono text-micro font-medium tracking-[.24em] opacity-60">
            GRADUS
          </span>
        </span>
      ) : null}
    </span>
  );
}
