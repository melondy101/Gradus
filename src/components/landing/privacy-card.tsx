import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/utils";

export interface PrivacyCardProps {
  title: string;
  body: ReactNode;
}

/**
 * 隐私带描边暗卡 —— 《品牌与产品设计说明》§2.6（原 `.priv`）：
 * 深色 Card 是实底，设计稿要的是「白雾浮起」的半透明卡，故用 3.5% 奶油覆盖；
 * 标题走等宽小字 + 强调黄（AI/隐私模块的统一语言），行内 <code> 由卡统一上药丸底。
 */
export function PrivacyCard({ title, body }: PrivacyCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 border-bd-dark bg-[rgba(245,242,234,.035)]",
        "transition-[background-color,border-color] duration-200 ease-out",
        "hover:border-on-dark-3 hover:bg-[rgba(245,242,234,.075)]",
        "[&_code]:rounded-[4px] [&_code]:bg-[rgba(245,242,234,.09)]",
        "[&_code]:px-[5px] [&_code]:py-px [&_code]:text-[12px] [&_code]:text-on-dark",
      )}
    >
      <h4 className="mb-3 font-mono text-[13px] font-bold tracking-[.08em] text-accent">
        {title}
      </h4>
      <p className="text-[14px] leading-[23px] text-on-dark-2">{body}</p>
    </Card>
  );
}
