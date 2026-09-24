"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { GradusLogo } from "@/components/ui/gradus-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import { wrapClass } from "./band-wrap";
import { APP_URL } from "./links";
import { auth } from "@/lib/eazo-shim";

/** 锚点链接组 —— id 与各 section 元素的 id 一一对应 */
const NAV_LINKS = [
  { id: "sec-whatsnew", label: "更新" },
  { id: "sec-how", label: "如何使用" },
  { id: "sec-cap", label: "核心能力" },
  { id: "sec-privacy", label: "隐私" },
] as const;

/** 导航链接：2px 墨色下划线由左向右擦入（原 `.lp-nav__links a::after`） */
const NAV_LINK_CLASS = cn(
  "relative py-1.5 text-body-lg font-medium text-text-2 transition-colors duration-[.16s]",
  "after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left",
  "after:scale-x-0 after:bg-ink after:content-['']",
  "after:transition-transform after:duration-200 hover:text-ink hover:after:scale-x-100",
);

/**
 * 1 · 吸顶导航 —— 《品牌与产品设计说明》§2.1
 * 台阶标识 + 字标 / 居中链接组 / 登录 + 墨色药丸 CTA。
 * 导航条自身铺满整幅（半透明白 + 背景模糊），内容收进版心。
 *
 * ⚠ body 是 overflow:hidden，真正的滚动容器是 LandingPage 的外层而非 window，
 * 因此用 IntersectionObserver 顶部哨兵判断吸顶态，不监听 window scroll。
 */
export function LandingNav() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS.map((link) =>
      document.getElementById(link.id)
    ).filter((node): node is HTMLElement => node !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-88px 0px -55% 0px", threshold: 0 }
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <header
        className={cn(
          "sticky top-0 z-40 h-[72px] w-full rounded-none border-b",
          "bg-[rgba(255,255,255,.86)] backdrop-blur-[10px]",
          "transition-[border-color,box-shadow] duration-200",
          stuck
            ? "border-bd-card shadow-[0_10px_26px_-22px_rgba(17,17,17,.4)]"
            : "border-transparent"
        )}
      >
        <div
          className={cn(
            wrapClass,
            "grid h-full grid-cols-[auto_1fr] items-center gap-6",
            "min-[1180px]:grid-cols-[1fr_auto_1fr]"
          )}
        >
          <Link
            href="/"
            aria-label="拾级 Gradus 首页"
            className="flex items-center justify-self-start gap-2.5 text-title font-black tracking-[.01em]"
          >
            <GradusLogo size={16} />
            <span>拾级</span>
          </Link>

          <nav className="hidden gap-8 min-[1180px]:justify-self-center min-[1180px]:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={activeId === link.id ? "true" : undefined}
                className={cn(
                  NAV_LINK_CLASS,
                  activeId === link.id && "after:scale-x-100"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-5">
            <button
              type="button"
              onClick={() => auth.login().catch(() => {})}
              className="text-body-lg font-medium text-text-2 transition-colors duration-[.16s] hover:text-ink"
            >
              登录
            </button>
            <Link
              href={APP_URL}
              className={cn(
                buttonVariants({ variant: "default", size: "sm" }),
                "hidden min-[680px]:inline-flex"
              )}
            >
              免费开始
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
