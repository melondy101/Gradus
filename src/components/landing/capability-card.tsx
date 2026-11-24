import type { LucideIcon } from "lucide-react";

import { BLOOM_CHROMATIC, BLOOM_CHROMATIC_TINT } from "@/lib/design-tokens";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/utils";

export interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
  /** 该能力在时间色谱上的位置（1–6），决定图标盒与顶条的颜色 */
  level?: number;
}

/**
 * 核心能力白卡 —— 《品牌与产品设计说明》§2.5（原 `.cap` + `.cap__i`）：
 * 白卡 212px 起跳，悬停抬升 4px、描边转墨、浮起投影；
 * 图标盒 40px / 方圆角 10 —— 底色改为该能力对应的时间色谱浅色，
 * 顶部再压一条同色色条，六张卡因此构成一条可读的色谱序列。
 */
export function CapabilityCard({
  icon: Icon,
  title,
  body,
  level = 1,
}: CapabilityCardProps) {
  const safe = Math.min(6, Math.max(1, level));
  const color = BLOOM_CHROMATIC[safe];
  const tint = BLOOM_CHROMATIC_TINT[safe];

  return (
    <Card
      className={cn(
        "min-h-[212px] gap-0 relative",
        "transition-[transform,border-color,box-shadow] duration-200 ease-out",
        "hover:-translate-y-1 hover:border-ink hover:shadow-[0_22px_44px_-26px_rgba(17,17,17,.4)]",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color }} aria-hidden="true" />
      <span
        className="grid size-10 place-items-center rounded-icon border"
        style={{ borderColor: color, background: tint, color }}
      >
        <Icon size={18} />
      </span>
      <h4 className="mt-4 mb-2 text-title font-bold">{title}</h4>
      <p className="text-body-lg leading-[24px] text-text-2">{body}</p>
    </Card>
  );
}
