"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { MobileTabBar } from "./mobile-tab-bar";
import type { NavView } from "./nav-items";
import { SideFooter } from "./side-footer";
import { SideNav } from "./side-nav";
import { SideTagFilter } from "./side-tag-filter";
import { SideUserCard } from "./side-user-card";
import { WeekProgressWidget } from "./week-progress-widget";
import {
  computeWeekProgress,
  type WeekProgressModel,
  type WeekSubtaskLike,
} from "./week-progress";

export type { NavView };

/** 《品牌与产品设计说明》§3：232px 侧边栏，跨屏整体复制，仅切换导航激活态 */
const SIDE_WIDTH = 232;

interface IconRailProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  /**
   * 侧栏「部件收展」信号（隐藏本周进度与标签列表）。
   * 新设计为固定 232px，不再有折叠窄栏，宽度不随之变化。
   */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  todayPendingCount: number;
  totalPlansCount: number;
  onOpenCommandPalette: () => void;
  onNewPlan: () => void;
  availableTags?: Array<{ tag: string; count: number }>;
  selectedTag?: string | null;
  onSelectTag?: (tag: string | null) => void;
  /**
   * 可选：本周进度所需的子任务明细。home-page 传已有的 `subtaskRows`
   * （SubtaskWithTask[] 结构兼容）即可；未传时部件退化为「今日待完成」口径，
   * 不显示任何编造数值。
   */
  weekSubtasks?: WeekSubtaskLike[];
}

export function IconRail({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapsed,
  todayPendingCount,
  totalPlansCount,
  onOpenCommandPalette,
  onNewPlan,
  availableTags = [],
  selectedTag = null,
  onSelectTag,
  weekSubtasks,
}: IconRailProps) {
  const [weekModel, setWeekModel] = useState<WeekProgressModel | null>(null);

  // 本周窗口依赖当前时间，只在挂载后计算，避免 SSR 与客户端日期不一致（同 home-page 的 todayStr 手法）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekModel(
      computeWeekProgress(weekSubtasks, {
        todayPending: todayPendingCount,
        totalPlans: totalPlansCount,
      })
    );
  }, [weekSubtasks, todayPendingCount, totalPlansCount]);

  const progressModel =
    weekModel ??
    computeWeekProgress(undefined, {
      todayPending: todayPendingCount,
      totalPlans: totalPlansCount,
    });

  return (
    <>
      {/* ── Desktop / Tablet 侧边栏（§3 共用外壳：232px 白底 + 1px 右描边） ── */}
      <div className="hidden h-full shrink-0 sm:flex" style={{ zIndex: 30 }}>
        <aside
          style={{ width: SIDE_WIDTH, flex: `0 0 ${SIDE_WIDTH}px` }}
          className="flex h-full select-none flex-col overflow-hidden border-r border-bd-card bg-card"
        >
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3.5 pb-4 pt-[18px] [scrollbar-width:thin]">
            {/* 品牌行：三级台阶标识 + 拾级 / GRADUS + 部件收展 */}
            <div className="flex items-center gap-[9px] px-1.5 pb-[18px]">
              <GradusLogo size={12} showText />
              <IconButton
                id="nav-btn-toggle-widgets"
                onClick={onToggleCollapsed}
                title={collapsed ? "展开侧栏部件" : "收起侧栏部件"}
                aria-label={collapsed ? "展开侧栏部件" : "收起侧栏部件"}
                className="ml-auto size-7 rounded-[8px] bg-card"
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </IconButton>
            </div>

            {/* 新建计划（快速入口，同时是新手引导的兜底锚点 #nav-btn-new-plan） */}
            <Button
              id="nav-btn-new-plan"
              variant="app"
              onClick={onNewPlan}
              title="新建学习任务 (N)"
              className="mb-4 h-[38px] w-full gap-2 px-3 text-[13.5px] font-bold"
            >
              <Plus size={16} strokeWidth={2.2} />
              <span>新建计划</span>
            </Button>

            {/* MENU 导航组（#nav-rail-group / #nav-item-<view> 为新手引导锚点） */}
            <SideNav
              currentView={currentView}
              onSelectView={onSelectView}
              todayPendingCount={todayPendingCount}
              totalPlansCount={totalPlansCount}
            />

            {/* 本周进度 */}
            {collapsed ? null : <WeekProgressWidget model={progressModel} />}

            {/* 标签筛选（收起部件时只保留标题行与已选标签摘要） */}
            <SideTagFilter
              availableTags={availableTags}
              selectedTag={selectedTag}
              onSelectTag={onSelectTag}
              totalPlansCount={totalPlansCount}
              compact={collapsed}
            />
          </div>

          {/* 固定底部功能簇：滚动内容不会挤走通知、会员、搜索与认证入口。 */}
          <div className="flex flex-none flex-col gap-2 border-t border-bd-card bg-card px-3.5 pb-4 pt-3">
            <SideFooter onOpenCommandPalette={onOpenCommandPalette} />
            <SideUserCard />
          </div>
        </aside>
      </div>

      {/* ── Mobile 底部 Tab（≤640px） ── */}
      <MobileTabBar
        currentView={currentView}
        onSelectView={onSelectView}
        todayPendingCount={todayPendingCount}
        totalPlansCount={totalPlansCount}
        onNewPlan={onNewPlan}
      />
    </>
  );
}
