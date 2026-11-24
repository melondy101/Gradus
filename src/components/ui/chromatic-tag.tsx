import { BLOOM_CHROMATIC, BLOOM_CONFIG } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

/**
 * 彩色层级标签 —— 「L3 应用」这类认知层级标记。
 *
 * 颜色取时间色谱（`BLOOM_CHROMATIC`），与任务详情页、天梯台阶、今日路线色轨
 * 同一套；旧实现用统一黄，暖纸底上会读成「上一个品牌的黄白黑」。
 */
export function ChromaticTag({
  level,
  label,
  className,
}: {
  /** 认知层级 1–6，超出范围会被夹到边界 */
  level: number;
  /** 标签文案；不传则自动取「L3 应用」 */
  label?: string;
  className?: string;
}) {
  const safe = Math.min(6, Math.max(1, Math.round(level)));
  const color = BLOOM_CHROMATIC[safe];
  const text = label ?? `L${safe} ${BLOOM_CONFIG[safe as keyof typeof BLOOM_CONFIG].name}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-micro font-bold tracking-[.06em] whitespace-nowrap",
        className,
      )}
      style={{ color }}
    >
      <span className="size-2 shrink-0" style={{ background: color }} aria-hidden="true" />
      {text}
    </span>
  );
}
