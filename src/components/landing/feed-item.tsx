import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

export interface FeedItemProps {
  date: string;
  title: string;
  body: string;
}

/**
 * What's New 更新条目 —— 《品牌与产品设计说明》§2.3（原 `.feed li`）：
 * 悬停时整行右移 16px、铺一层自左向右的淡黄渐变，并在左缘长出 8px 黄色刻度。
 */
export function FeedItem({ date, title, body }: FeedItemProps) {
  return (
    <li
      className={cn(
        "relative border-b border-bd-card py-[22px] pr-1 pl-0",
        "transition-[padding,background-color] duration-200 ease-out",
        "before:absolute before:left-0 before:top-1/2 before:h-[2px] before:w-0",
        "before:-translate-y-1/2 before:bg-accent before:content-['']",
        "before:transition-[width] before:duration-200",
        "hover:pl-4 hover:bg-[linear-gradient(90deg,rgba(245,197,24,.14),transparent_60%)]",
        "hover:before:w-[8px]",
      )}
    >
      <Mono className="mb-[7px] block text-text-3">{date}</Mono>
      <h4 className="mb-[5px] text-title-sm font-bold">{title}</h4>
      <p className="max-w-[600px] text-body-lg leading-[24px] text-text-2">
        {body}
      </p>
    </li>
  );
}
