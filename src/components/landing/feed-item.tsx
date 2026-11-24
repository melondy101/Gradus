import { BLOOM_CHROMATIC } from "@/lib/design-tokens";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

export interface FeedItemProps {
  date: string;
  title: string;
  body: string;
  /** 这条更新在时间色谱上的位置（1–6），左缘色条取该色 */
  level?: number;
}

/**
 * What's New 更新条目 —— 《品牌与产品设计说明》§2.3（原 `.feed li`）：
 * 每条左缘常驻一条时间色谱色条（暖纸底上的彩色锚点），悬停时色条加粗成 8px 刻度，
 * 整行右移 16px 并铺一层自左向右的淡朱红渐变。
 */
export function FeedItem({ date, title, body, level = 1 }: FeedItemProps) {
  const color = BLOOM_CHROMATIC[Math.min(6, Math.max(1, level))];

  return (
    <li
      className={cn(
        "group relative border-b border-bd-card py-5 pr-1 pl-5",
        "transition-[padding,background-color] duration-200 ease-out",
        "hover:pl-6 hover:bg-[linear-gradient(90deg,var(--error-soft),transparent_60%)]",
      )}
    >
      <span
        className="absolute inset-y-5 left-0 w-1 transition-[width] duration-200 group-hover:w-2"
        style={{ background: color }}
        aria-hidden="true"
      />
      <div className="mb-1.5 flex items-center gap-2">
        <Mono className="text-text-3">{date}</Mono>
      </div>
      <h4 className="mb-1 text-title-sm font-bold">{title}</h4>
      <p className="max-w-[600px] text-body-lg leading-[24px] text-text-2">
        {body}
      </p>
    </li>
  );
}
