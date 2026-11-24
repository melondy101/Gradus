"use client";

/**
 * 时间色谱共用外壳 · 顶部横向导航条（design-demos/time-chromatics/time.css 的 .top）。
 *
 * 结构对照原型：品牌（三级台阶 + 拾级 · 时间色谱）→ 横向四视图导航（激活态朱红下划线）
 * → 右侧日期 / 新建 / 通知 / 搜索 / 主题 / 账户。左侧纵向侧栏已移除，
 * 其全部功能入口都收编到本条：新建（#nav-btn-new-plan）、主导航（#nav-rail-group /
 * #nav-item-<view>，onboarding-tour 锚点勿改）、通知、命令面板、明暗切换与登录入口。
 * 移动端（<640px）导航由 MobileTabBar 底部 Tab 承担，本条只保留品牌与账户簇。
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Badge } from "@/components/ui/badge";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { IconButton } from "@/components/ui/icon-button";
import { Mono } from "@/components/ui/eyebrow";
import { LevelBadge } from "@/components/home/level-badge";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { UserBadge } from "@/components/user-profile/user-badge";
import { NAV_ITEMS, navItemBadge, type NavView } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

interface TopNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  todayPendingCount: number;
  totalPlansCount: number;
  selectedTag: string | null;
  onClearTag: () => void;
  onOpenPalette: () => void;
  onNewPlan: () => void;
  showLevelBadge: boolean;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"] as const;

export function TopNav({
  currentView,
  onSelectView,
  todayPendingCount,
  totalPlansCount,
  selectedTag,
  onClearTag,
  onOpenPalette,
  onNewPlan,
  showLevelBadge,
}: TopNavProps) {
  // 日期标签依赖客户端当前时间，挂载后再计算，避免 SSR 与客户端不一致
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 沿用 SSR 安全日期模式，挂载后再计算避免与服务端渲染不一致
    setDateLabel(`${now.getMonth() + 1}月${now.getDate()}日 · 周${WEEKDAYS[now.getDay()]}`);
  }, []);

  return (
    <header
      className="flex h-[60px] flex-none items-center gap-2 border-b px-3 sm:h-[76px] sm:gap-6 sm:px-10"
      style={{ background: T.bg, borderColor: T.lineCheck }}
    >
      {/* 品牌：三级台阶（顶点朱红）+ 衬线字标 */}
      <Link
        href="/app"
        className="flex min-w-0 shrink items-center gap-2 transition-opacity hover:opacity-85 sm:gap-2.5"
        aria-label="拾级 Gradus 首页"
      >
        <GradusLogo size={26} />
        <span className="truncate whitespace-nowrap font-chromatic text-title-sm font-extrabold tracking-[-.01em] text-ink sm:text-title-lg">
          拾级 · 时间色谱
        </span>
      </Link>

      {/* 横向主导航（移动端隐藏，由 MobileTabBar 承担）。
          id 约定：#nav-rail-group 与 #nav-item-<view> 由 onboarding-tour 定位高亮，勿改。 */}
      <nav
        id="nav-rail-group"
        className="hidden items-center gap-6 self-stretch sm:ml-12 sm:flex"
        aria-label="主导航"
      >
        {NAV_ITEMS.map((item) => {
          const active = currentView === item.id;
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
              className="flex items-center gap-1.5 whitespace-nowrap py-2 text-body-sm font-medium transition-colors duration-[.16s] ease-out"
              style={{
                color: active ? T.error : T.ink,
                borderBottom: `2px solid ${active ? T.error : "transparent"}`,
                marginBottom: -1,
              }}
            >
              <span>{item.label}</span>
              {badge !== undefined && (
                <Mono className="text-micro font-bold opacity-70">{badge}</Mono>
              )}
            </a>
          );
        })}
      </nav>

      {/* 激活中的标签筛选（跨视图共用，可一键清除） */}
      {selectedTag && (
        <Badge state="live" id="header-active-tag-filter" className="gap-1 px-1.5 py-0.5">
          <TagIcon size={11} className="shrink-0" />
          <span className="max-w-[60px] truncate sm:max-w-[120px]">{selectedTag}</span>
          <button
            type="button"
            onClick={onClearTag}
            aria-label="清除标签过滤"
            className="flex shrink-0 cursor-pointer"
          >
            <X size={11} />
          </button>
        </Badge>
      )}

      {/* 右侧簇：日期 / 等级徽章 / 新建 / 通知 / 搜索 / 主题 / 账户 */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
        {dateLabel && (
          <span className="hidden whitespace-nowrap font-chromatic text-body-sm tracking-[1px] text-text-2 md:inline">
            {dateLabel}
          </span>
        )}

        {showLevelBadge && (
          <span className="hidden lg:inline-flex">
            <LevelBadge />
          </span>
        )}

        {/* 新建学习目标（新手引导 step 1 的锚点 #nav-btn-new-plan；移动端收成图标，底部 Tab 也有同类入口） */}
        <button
          type="button"
          id="nav-btn-new-plan"
          onClick={onNewPlan}
          title="新建学习任务 (N)"
          aria-label="新建学习任务"
          className="flex size-[32px] shrink-0 items-center justify-center gap-1.5 text-body-sm font-bold transition-transform duration-[.16s] ease-out hover:-translate-y-px sm:h-[34px] sm:w-auto sm:px-3"
          style={{ background: T.ink, color: T.bg }}
        >
          <Plus size={13} strokeWidth={2.2} />
          <span className="hidden sm:inline">新建</span>
        </button>

        <span className="flex w-[32px] shrink-0 items-center [&>div]:w-full sm:w-[34px]">
          <NotificationCenter collapsed id="nav-btn-notifications" />
        </span>

        <IconButton
          id="nav-btn-command-palette"
          onClick={onOpenPalette}
          title="搜索 / 命令 (⌘K)"
          aria-label="打开命令面板"
          className="size-[32px] rounded-none p-0 text-body sm:size-[34px]"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </IconButton>

        <ThemeToggle className="size-[32px] rounded-none sm:size-[34px]" />

        <UserBadge compact />
      </div>
    </header>
  );
}
