import {
  CalendarDays,
  Clock,
  ListTodo,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * 主视图枚举 —— 与 home-page 的 currentView 状态一一对应。
 * （TopNav 顶部横向导航与 MobileTabBar 底部 Tab 共用这一份数据）
 */
export type NavView = "today" | "plans" | "steps" | "timeline";

export interface RailNavItem {
  id: NavView;
  /** 顶部导航与底部 Tab 的完整文案 */
  label: string;
  /** 移动端底部 Tab 的窄文案 */
  shortLabel: string;
  icon: LucideIcon;
}

/**
 * 顶部横向导航与底部 Tab 共用同一份导航数据（跨屏一致，仅切换激活态）。
 * 拾级天梯（steps）是本产品特有视图，沿用应用内名称。
 */
export const NAV_ITEMS: RailNavItem[] = [
  { id: "today", label: "今日路线", shortLabel: "今日", icon: CalendarDays },
  { id: "plans", label: "任务色谱", shortLabel: "计划", icon: ListTodo },
  { id: "steps", label: "拾级天梯", shortLabel: "天梯", icon: TrendingUp },
  { id: "timeline", label: "接续排期", shortLabel: "排期", icon: Clock },
];

export interface NavBadgeCounts {
  todayPending: number;
  totalPlans: number;
}

/** 角标只在有数据时出现：今日待办数 / 计划总数 */
export function navItemBadge(
  id: NavView,
  { todayPending, totalPlans }: NavBadgeCounts
): number | undefined {
  if (id === "today" && todayPending > 0) return todayPending;
  if (id === "plans" && totalPlans > 0) return totalPlans;
  return undefined;
}
