import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/utils";

export interface CapabilityCardProps {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * 核心能力白卡 —— 《品牌与产品设计说明》§2.5（原 `.cap` + `.cap__i`）：
 * 白卡 212px 起跳，悬停抬升 4px、描边转墨、浮起投影；
 * 图标盒 40px / 方圆角 10 / 奶油底（比白卡低一档，靠描边区分）。
 */
export function CapabilityCard({
  icon: Icon,
  title,
  body,
}: CapabilityCardProps) {
  return (
    <Card
      className={cn(
        "min-h-[212px] gap-0",
        "transition-[transform,border-color,box-shadow] duration-200 ease-out",
        "hover:-translate-y-1 hover:border-ink hover:shadow-[0_22px_44px_-26px_rgba(17,17,17,.4)]",
      )}
    >
      <span className="grid size-10 place-items-center rounded-icon border border-bd-card bg-cream text-title-sm text-ink">
        <Icon size={18} />
      </span>
      <h4 className="mt-4 mb-2 text-title font-bold">{title}</h4>
      <p className="text-body-lg leading-[24px] text-text-2">{body}</p>
    </Card>
  );
}
