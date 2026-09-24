"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BrandBackLinkProps {
  href: string;
  children: React.ReactNode;
}

/**
 * 设计稿返回行（`.back`）：11px 等宽小字 + text-3，
 * 悬停转墨并左移 3px，作为屏二 / 历史页的统一返回语言。
 */
export function BrandBackLink({ href, children }: BrandBackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-3.5 inline-block font-mono text-caption font-medium tracking-[.05em] text-text-3 transition-[color,transform] duration-[.16s] ease-out hover:translate-x-[-3px] hover:text-ink"
    >
      <ArrowLeft size={12} aria-hidden className="mr-[5px] inline align-[-2px]" />
      {children}
    </Link>
  );
}
