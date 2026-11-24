import { BLOOM_CHROMATIC } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

/**
 * 时间色谱色轨 —— L1→L6 六段（青苔绿 / 金 / 赭 / 朱砂 / 赭红 / 靛）。
 *
 * 这是「时间色谱」这套设计语言在暖纸底上唯一的彩色锚点：落地页的更新条目、
 * 流程步骤、能力卡、额度卡都用它标出「这一步处在色谱的哪一段」，
 * 从而让这些区块不再是「白卡 + 黑字 + 一点黄」的旧配色。
 *
 * 语义与层级绑定：levels 传入时，未出现的层级降到 0.18 不透明度。
 */
export function ChromaticTrack({
  levels,
  className,
}: {
  /** 出现的层级（1–6）；不传则六段全亮 */
  levels?: number[];
  className?: string;
}) {
  return (
    <div className={cn("grid h-2.5 grid-cols-6", className)} aria-hidden="true">
      {[1, 2, 3, 4, 5, 6].map((level) => (
        <span
          key={level}
          className="transition-opacity"
          style={{
            background: BLOOM_CHROMATIC[level],
            opacity: !levels || levels.includes(level) ? 1 : 0.18,
          }}
        />
      ))}
    </div>
  );
}
