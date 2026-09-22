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
}: SideNavProps) {
  return (
    <>
      <Eyebrow kind="label" className="mb-1.5 px-1.5">
        MENU
      </Eyebrow>
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
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                onSelectView(item.id);
              }}
              className={cn(
                "flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-sm font-medium",
                "transition-[background-color,color] duration-[.16s] ease-out",
                active
                  ? "bg-ink font-bold text-cream"
                  : "text-text-2 hover:bg-cream-light hover:text-ink"
              )}
            >
              <span
                className={cn(
                  "grid w-[15px] shrink-0 place-items-center text-center transition-colors duration-[.16s]",
                  active ? "text-accent" : "text-text-3"
                )}
              >
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              </span>
              <span>{item.label}</span>
              {badge !== undefined && (
                <Mono className="ml-auto text-[10px] font-bold opacity-70">{badge}</Mono>
              )}
            </a>
          );
        })}
      </nav>
    </>
  );
}
