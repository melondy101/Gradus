"use client";

import React from "react";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { NAV_ITEMS, navItemBadge, type NavView } from "./nav-items";

interface SideNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  todayPendingCount: number;
  totalPlansCount: number;
  /** 侧栏折叠为图标栏时：隐藏 MENU 眉题与文字，角标改为右上角小圆点 */
  compact?: boolean;
}

/**
 * 侧边栏 MENU 导航组（§3 共用外壳）。
 * 激活态（墨底 + 奶油字 + 黄色图标）由组件自身的 data-driven 类名给出，
 * 不再依赖 `.side__nav a` 这类后代选择器；视图切换仍是纯状态，故阻止 hash 跳转。
 *
 * id 约定：#nav-rail-group 与 #nav-item-<view> 由 onboarding-tour 定位高亮，勿改。
 */
export function SideNav({
  currentView,
  onSelectView,
  todayPendingCount,
  totalPlansCount,
  compact = false,
}: SideNavProps) {
  return (
    <>
      {compact ? null : (
        <Eyebrow kind="label" className="mb-1.5 px-1.5">
          MENU
        </Eyebrow>
      )}
      <nav id="nav-rail-group" className="flex flex-col gap-0.5" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const active = currentView === item.id;
          const Icon = item.icon;
          const badge = navItemBadge(item.id, {
            todayPending: todayPendingCount,
            totalPlans: totalPlansCount,
          });

          return (
            <a
              key={item.id}
              id={`nav-item-${item.id}`}
              href={`#${item.id}`}
              title={item.label}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSelectView(item.id);
              }}
              className={cn(
                "relative rounded-[10px] text-sm font-medium",
                "transition-[background-color,color] duration-[.16s] ease-out",
                active
                  ? "bg-ink font-bold text-cream"
                  : "text-text-2 hover:bg-cream-light hover:text-ink",
                compact
                  ? "flex h-10 items-center justify-center"
                  : "flex items-center gap-[11px] px-3 py-2.5"
              )}
            >
              <span
                className={cn(
                  "grid shrink-0 place-items-center text-center transition-colors duration-[.16s]",
                  compact ? "" : "w-[15px]",
                  active ? "text-accent" : "text-text-3"
                )}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              {compact ? null : <span>{item.label}</span>}
              {badge !== undefined && !compact && (
                <Mono className="ml-auto text-[10px] font-bold opacity-70">{badge}</Mono>
              )}
              {badge !== undefined && compact && (
                <span className="absolute right-0.5 top-0.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-accent px-[3px] font-mono text-[9px] font-bold text-ink">
                  {badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>
    </>
  );
}
