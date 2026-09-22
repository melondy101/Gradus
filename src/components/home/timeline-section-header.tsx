"use client";

/**
 * 时间桶标题（今日 / 明日 / 本周 / 7 天后）。
 *
 * 形状沿用 §1.4 的 `.card__head`（基线对齐的标题 + 右侧元信息），左侧 3.5px 竖条
 * 取该时间桶的令牌色；「黄只给此刻」——只有 today 的竖条是点缀黄，其后依次退到暖灰。
 */

import { useTranslation } from "react-i18next";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { Tag } from "@/components/ui/badge";
import { cn } from "@/utils/utils";
import { sectionBarClass } from "./task-accent";
import type { TimeFilter } from "./timeline-sections";

interface SectionHeaderProps {
  label: string;
  sublabel: string;
  /** 时间桶身份，决定竖条用哪一枚令牌色 */
  tone: TimeFilter;
  pendingCount: number;
}

export function TimelineSectionHeader({ label, sublabel, tone, pendingCount }: SectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <CardHeader className="mb-2.5">
      <span className="flex items-center gap-1">
        <span aria-hidden className={cn("h-[18px] w-[3.5px] shrink-0 rounded-[2px]", sectionBarClass(tone))} />
        <CardTitle>{label}</CardTitle>
        <Mono className="text-[12px] font-normal tracking-normal text-text-3">{sublabel}</Mono>
      </span>

      {pendingCount > 0 && (
        <Tag className="rounded-pill bg-accent-soft px-2 py-[2px] text-[11px] text-accent-ink">
          {t("timelineCard.pendingCount", { count: pendingCount })}
        </Tag>
      )}
    </CardHeader>
  );
}
