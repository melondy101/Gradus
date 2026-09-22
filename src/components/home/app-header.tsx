"use client";

/**
 * 应用顶栏（跨视图共用）：品牌 / 当前视图 / 标签过滤 / 等级徽章 + 新建入口。
 *
 * DOM 契约：#btn-header-new-task 与 #header-active-tag-filter 由 onboarding-tour
 * 与统计逻辑消费，改名前先确认引用。
 */

import Link from "next/link";
import { Crown, Plus, Search, Tag as TagIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { IconButton } from "@/components/ui/icon-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { UserBadge } from "@/components/user-profile/user-badge";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import type { NavView } from "@/components/layout/icon-rail";
import { LevelBadge } from "./level-badge";

interface Props {
  currentView: NavView;
  selectedTag: string | null;
  onClearTag: () => void;
  onOpenPalette: () => void;
  onNewTask: () => void;
  showLevelBadge: boolean;
  streakTick: number;
}

const VIEW_LABEL: Record<NavView, string> = {
  today: "今日面板",
  plans: "我的任务",
  steps: "拾级天梯",
  timeline: "时间甘特图",
};

export function AppHeader({
  currentView, selectedTag, onClearTag, onOpenPalette, onNewTask, showLevelBadge, streakTick,
}: Props) {
  return (
    <header className="flex h-[52px] flex-none items-center justify-between gap-2 border-b border-bd-card bg-card px-3.5">
      <div className="flex min-w-0 items-center gap-2 overflow-hidden">
        <Link
          href="/app"
          className="flex items-center gap-1.5 shrink-0 transition-opacity hover:opacity-85 sm:hidden"
          aria-label="拾级 Gradus 首页"
        >
          <GradusLogo size={26} />
          <span className="text-[15px] font-black tracking-[.02em] text-ink">拾级</span>
        </Link>

        <Eyebrow kind="label" className="mb-0">{VIEW_LABEL[currentView]}</Eyebrow>

        {selectedTag && (
          <Badge state="live" id="header-active-tag-filter" className="gap-1 px-[7px] py-[2px]">
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

        {showLevelBadge && (
          <span className="hidden md:inline-flex">
            <LevelBadge refreshTick={streakTick} />
          </span>
        )}
      </div>

      {/* 桌面端：检索与新建入口（⌘K 是同一能力，这里放一个可见入口） */}
      <div className="hidden items-center gap-2 sm:flex">
        <IconButton onClick={onOpenPalette} aria-label="搜索" className="size-8 rounded-[10px]">
          <Search size={16} />
        </IconButton>
        <Button id="btn-header-new-task" size="xs" onClick={onNewTask}>
          <Plus size={13} />
          <span>新学习目标</span>
        </Button>
        <ThemeToggle />
      </div>

      {/* 移动端顶栏快捷操作 */}
      <div className="flex items-center gap-1 shrink-0 sm:hidden">
        <IconButton onClick={onOpenPalette} aria-label="搜索" className="size-8 rounded-[10px]">
          <Search size={18} />
        </IconButton>
        <NotificationCenter />
        <ThemeToggle />
        <IconButton
          onClick={() => openMembershipModal("overview")}
          aria-label="会员中心"
          className="size-8 rounded-[10px] text-accent-ink"
        >
          <Crown size={18} />
        </IconButton>
        <UserBadge />
      </div>
    </header>
  );
}
