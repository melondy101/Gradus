"use client";

import Link from "next/link";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { Mono } from "@/components/ui/eyebrow";

interface BrandPageShellProps {
  /** 内容最大宽度：屏二比历史页更宽（主列 + 380px 详情面板） */
  maxWidth?: number;
  /** 品牌栏右端 mono 角标 */
  railLabel?: string;
  /** 角标若带链接（如历史任务入口），在此给出目标路由 */
  railHref?: string;
  children: React.ReactNode;
}

/**
 * 独立路由（/task/[id]、/history）共用的品牌外壳：
 * 画布底色 = --cream（§1.3 body 底），白底细描边品牌栏（台阶标识 + 字标），
 * 内容区居中并按设计稿留白。宽度随 maxWidth 变化，故只有这一处走内联样式。
 * data-slot="page-canvas" 是 design-audit 量画布底色的落点。
 */
export function BrandPageShell({
  maxWidth = 1240,
  railLabel = "TASK DETAIL",
  railHref,
  children,
}: BrandPageShellProps) {
  return (
    <div
      data-slot="page-canvas"
      className="min-h-screen bg-cream pb-[var(--safe-bottom)] pt-[var(--safe-top)]"
    >
      <nav className="flex items-center justify-between gap-4 border-b border-bd-card bg-card px-7 py-3.5">
        <Link
          href="/app"
          title="返回今日面板"
          className="inline-flex items-center gap-[9px]"
        >
          <GradusLogo size={15} />
          <b className="text-[17px] font-black tracking-[.02em]">拾级</b>
        </Link>
        {railHref ? (
          <Link href={railHref}>
            <Mono className="text-text-3 underline">{railLabel}</Mono>
          </Link>
        ) : (
          <Mono className="text-text-3">{railLabel}</Mono>
        )}
      </nav>

      <div
        className="mx-auto pb-7 pt-[18px]"
        style={{ width: `min(100% - 32px, ${maxWidth}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
