import { Card } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

export interface StepCardProps {
  no: string;
  title: string;
  body: string;
}

/**
 * 流程步骤白卡 —— 《品牌与产品设计说明》§2.4（原 `.step`）：
 * 白卡 26/24 内边距，悬停抬升 4px 并浮起投影；卡间箭头即原 `.step::after`
 * 的「→」，只在 1180px 以上、且最后一张不画。
 */
export function StepCard({ no, title, body }: StepCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 py-[26px] relative overflow-visible",
        "transition-[transform,border-color,box-shadow] duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(17,17,17,.35)]",
        "after:absolute after:right-[-16px] after:top-1/2 after:hidden",
        "after:-translate-y-1/2 after:text-[18px] after:text-bd-check",
        "after:content-['']",
        "min-[1180px]:after:block min-[1180px]:after:content-['→']",
        "min-[1180px]:last:after:hidden",
      )}
    >
      <Mono className="block text-text-3">{no}</Mono>
      <h4 className="mt-3.5 mb-2 text-[19px] font-bold">{title}</h4>
      <p className="text-[14.5px] leading-[24px] text-text-2">{body}</p>
    </Card>
  );
}
