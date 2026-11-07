"use client";

/**
 * 天梯 / 甘特首屏加载态（交互文档 §2.1：后三视图原先未消费 fetching）。
 * 用与今日路线相同的行骨架，避免「加载中」直接闪成空态。
 */

import { T } from "@/lib/design-tokens";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ListSkeleton } from "./list-skeleton";

export function ViewLoadingState() {
  return (
    <section className="border border-bd-card px-5 py-4" style={{ background: T.soft }}>
      <Eyebrow>LOADING / 正在读取你的学习路线</Eyebrow>
      <div className="mt-3 h-5 w-2/5 animate-pulse bg-bd-card" aria-hidden="true" />
      <div className="mt-3 border-t border-bd-card">
        <ListSkeleton />
      </div>
    </section>
  );
}
