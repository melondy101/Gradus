import { BLOOM_CHROMATIC } from "@/lib/design-tokens";
import { Card } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

export interface StepCardProps {
  no: string;
  title: string;
  body: string;
  /** 该步骤在时间色谱上的位置（1–6），决定卡顶色条与步骤号颜色 */
  level?: number;
}

/**
 * 流程步骤白卡 —— 《品牌与产品设计说明》§2.4（原 `.step`）：
 * 白卡 26/24 内边距，悬停抬升 4px 并浮起投影；卡间箭头即原 `.step::after`
 * 的「→」，只在 1180px 以上、且最后一张不画。
 *
 * 顶部一条时间色谱色条 + 同色步骤号，让「四步」读成一条有色彩序列的路径，
 * 而不是四张一模一样的白卡；箭头改朱红（暖纸底上的唯一强调色）。
 */
export function StepCard({ no, title, body, level = 1 }: StepCardProps) {
  const color = BLOOM_CHROMATIC[Math.min(6, Math.max(1, level))];

  return (
    <Card
      className={cn(
        "gap-0 py-6 relative overflow-visible",
        "transition-[transform,border-color,box-shadow] duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(17,17,17,.35)]",
        "after:absolute after:right-[-16px] after:top-1/2 after:hidden",
        "after:-translate-y-1/2 after:text-[18px] after:text-error",
        "after:content-['']",
        "min-[1180px]:after:block min-[1180px]:after:content-['→']",
        "min-[1180px]:last:after:hidden",
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: color }}
        aria-hidden="true"
      />
      <Mono className="block" style={{ color }}>
        {no}
      </Mono>
      <h4 className="mt-3.5 mb-2 text-title font-bold">{title}</h4>
      <p className="text-body-lg leading-[24px] text-text-2">{body}</p>
    </Card>
  );
}
