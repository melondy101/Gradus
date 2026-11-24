import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/utils";

export interface PrivacyCardProps {
  title: string;
  body: ReactNode;
}

/**
 * 隐私带白卡 —— 与应用内白卡同一套语言：1px 描边、悬停描边转墨。
 * 标题用等宽小字 + 朱红（时间色谱的强调色），行内 <code> 由卡统一上奶油底药丸。
 * 旧版是深色带上的半透明暗卡 + 黄色标题，属于重构前的配色。
 */
export function PrivacyCard({ title, body }: PrivacyCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 border-bd-card bg-card",
        "transition-[background-color,border-color] duration-200 ease-out",
        "hover:border-ink hover:bg-cream-light",
        "[&_code]:rounded-chip-sm [&_code]:bg-cream-light [&_code]:px-[5px] [&_code]:py-px",
        "[&_code]:text-body-sm [&_code]:text-ink",
      )}
    >
      <h4 className="mb-3 font-mono text-body font-bold tracking-[.08em] text-error">
        {title}
      </h4>
      <p className="text-[14px] leading-[23px] text-text-2">{body}</p>
    </Card>
  );
}
