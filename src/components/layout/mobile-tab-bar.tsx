"use client";

import React from "react";
import { Plus } from "lucide-react";
import { Mono } from "@/components/ui/eyebrow";
import { NAV_ITEMS, navItemBadge, type NavView } from "./nav-items";

interface MobileTabBarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  todayPendingCount: number;
  totalPlansCount: number;
  onNewPlan: () => void;
}

const TAB =
  "flex h-[52px] min-h-12 flex-1 flex-col items-center justify-center gap-[3px] py-1 transition-transform active:scale-95";
const PILL =
  "flex items-center justify-center rounded-pill px-3 py-[3px] transition-colors duration-[.18s]";
const INDICATOR = "h-[3px] w-4 rounded-[2px]";

/**
 * 移动端底部 Tab（§6：侧边栏收成底部 Tab）。
 * 品牌语言：白底 + 1px 描边分隔线，激活态墨色 pill + 点缀黄指示条，
 * 保留 iOS 安全区内边距与「新建」快捷入口。
 */
export function MobileTabBar({
  currentView,
  onSelectView,
  todayPendingCount,
  totalPlansCount,
  onNewPlan,
}: MobileTabBarProps) {
  return (
    <nav
      className={
        "fixed inset-x-0 bottom-0 z-50 flex touch-manipulation items-center justify-around " +
        "gap-0 border-t border-bd-card bg-card px-1 select-none " +
        "h-[calc(56px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] sm:hidden"
      }
      aria-label="移动端底部主导航"
    >
      {NAV_ITEMS.map((item) => {
        const active = currentView === item.id;
        const Icon = item.icon;
        const badge = navItemBadge(item.id, {
          todayPending: todayPendingCount,
          totalPlans: totalPlansCount,
        });

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectView(item.id)}
            aria-current={active ? "page" : undefined}
            className={TAB + (active ? " text-ink" : " text-text-3")}
          >
            <span
              className={
                PILL +
                (active ? " relative bg-ink text-cream" : " relative bg-transparent text-text-3")
              }
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              {badge !== undefined && (
                <Mono className="absolute -top-px right-0.5 rounded-pill bg-accent px-1 py-px text-[9px] font-black leading-none text-ink">
                  {badge}
                </Mono>
              )}
            </span>
            <span className={INDICATOR + (active ? " bg-accent" : " bg-transparent")} />
            <span className={`text-[10.5px] ${active ? "font-bold" : "font-medium"}`}>
              {item.shortLabel}
            </span>
          </button>
        );
      })}

      {/* 新建学习任务 */}
      <button
        type="button"
        id="btn-mobile-new-task"
        aria-label="新建学习任务"
        onClick={onNewPlan}
        title="新建学习任务 (N)"
        className={TAB + " text-ink"}
      >
        <span className={PILL + " bg-ink text-accent"}>
          <Plus size={19} strokeWidth={2.2} />
        </span>
        <span className={INDICATOR + " bg-transparent"} />
        <span className="text-[10.5px] font-bold">新建</span>
      </button>
    </nav>
  );
}
