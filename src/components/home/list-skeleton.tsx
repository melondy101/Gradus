"use client";

/**
 * 列表骨架屏 —— 与 <SubtaskLine> 同一套行几何（22px 复选框列 + 标题 + 两列元信息），
 * 品牌口径：白卡 + 细描边、无阴影、animate-pulse。
 */

import { Tag } from "@/components/ui/badge";
import { Mono } from "@/components/ui/eyebrow";

/** 逐行递减的占位宽度（静态类名，保证 Tailwind 扫描得到） */
const TITLE_WIDTH = ["w-[68%]", "w-[61%]", "w-[54%]", "w-[47%]"];

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="flex flex-col py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid animate-pulse grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-bd-card py-[9px] pr-2 pl-[5px] first:border-t-0"
        >
          <span className="size-[20px] rounded-[6px] hairline border-bd-field bg-cream-light" />
          <div className="min-w-0">
            <span
              className={`block h-[13px] rounded-[4px] bg-cream-light ${TITLE_WIDTH[i % TITLE_WIDTH.length]}`}
            />
            <span className="mt-0.5 block h-[10px] w-[38%] rounded-[4px] bg-cream-light" />
          </div>
          <Tag>L—</Tag>
          <Mono className="text-[10px] whitespace-nowrap text-text-3">—h</Mono>
        </div>
      ))}
    </div>
  );
}
