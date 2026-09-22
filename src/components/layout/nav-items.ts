import {
  CalendarDays,
  Clock,
  ListTodo,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

/**
 * 主视图枚举 —— 与 home-page 的 currentView 状态一一对应。
 * （icon-rail.tsx 会把它再导出，保持 `import type { NavView } from "@/components/layout/icon-rail"` 不变）
 */
export type NavView = "today" | "plans" | "steps" | "timeline";

export interface RailNavItem {
  id: NavView;
  /** 侧边栏文案（《拾级 Gradus · 品牌与产品设计说明》§3 共用外壳） */
  label: string;
  /** 移动端底部 Tab 的窄文案 */
  shortLabel: string;
  icon: LucideIcon;
}

/**
 * 侧边栏与底部 Tab 共用同一份导航数据（跨屏一致，仅切换激活态）。
 * 拾级天梯（steps）是本产品特有视图，沿用应用内名称。
 */
export const NAV_ITEMS: RailNavItem[] = [
  { id: "today", label: "今日面板", shortLabel: "今日", icon: CalendarDays },
  { id: "plans", label: "我的任务", shortLabel: "任务", icon: ListTodo },
  { id: "steps", label: "拾级天梯", shortLabel: "天梯", icon: TrendingUp },
  { id: "timeline", label: "甘特视图", shortLabel: "甘特", icon: Clock },
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
