"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { T } from "@/lib/design-tokens";
import { UserBadge } from "@/components/user-profile/user-badge";
import { useAppTheme } from "@/components/theme/theme-provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import type { TaskWithSubtasks } from "@/lib/api/tasks";

export type NavView = "today" | "plans" | "steps" | "timeline";

interface SidebarNavProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  todayPendingCount: number;
  tasks: TaskWithSubtasks[];
  onSelectTask: (taskId: string) => void;
  onOpenCommandPalette: () => void;
  onNewPlan: () => void;
}

export function SidebarNav({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapsed,
  todayPendingCount,
  tasks,
  onSelectTask,
  onOpenCommandPalette,
  onNewPlan,
}: SidebarNavProps) {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useAppTheme();

  const brandName = t("brand.name", "拾级");
  const brandChar = t("brand.char", "拾");
  const brandSub = t("brand.sub", "GRADUS");
  const brandSlogan = t("brand.slogan", "循序渐进 · 聚木成林");

  const navItems: Array<{ id: NavView; label: string; icon: string; badge?: number }> = [
    { id: "today", label: t("nav.today", "今日聚焦"), icon: "🌟", badge: todayPendingCount },
    { id: "plans", label: t("nav.plans", "所有计划"), icon: "📂", badge: tasks.length },
    { id: "steps", label: t("nav.steps", "拾级天梯"), icon: "🪜" },
    { id: "timeline", label: t("nav.timeline", "时间视图"), icon: "📅" },
  ];

  return (
    <aside
      style={{
        width: collapsed ? 60 : 240,
        height: "100%",
        background: T.surface,
        borderRight: `1px solid ${T.line}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        flexShrink: 0,
        overflow: "hidden",
        userSelect: "none",
        zIndex: 20,
      }}
    >
      {/* 上半部：品牌标识 + 核心导航 + 计划列表 */}
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* 品牌头部 */}
        <div
          style={{
            height: 60,
            padding: collapsed ? "0 12px" : "0 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${T.line}`,
          }}
        >
          {!collapsed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {/* 拾级木印章徽标 */}
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: "rgba(74,124,111,0.12)",
                  border: `1.5px solid ${T.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: T.accent,
                  fontWeight: 800,
                  fontSize: 16,
                  fontFamily: "var(--font-serif), 'Songti SC', serif",
                  boxShadow: "0 2px 6px rgba(74,124,111,0.15)",
                  flexShrink: 0,
                }}
              >
                {brandChar}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  className="font-editorial"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: T.ink,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {brandName}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: T.accent,
                      background: "rgba(74,124,111,0.1)",
                      border: "1px solid rgba(74,124,111,0.2)",
                      borderRadius: 3,
                      padding: "0 4px",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {brandSub}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {brandSlogan}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 7,
                background: "rgba(74,124,111,0.12)",
                border: `1.5px solid ${T.accent}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: T.accent,
                fontWeight: 800,
                fontSize: 16,
                fontFamily: "var(--font-serif), serif",
                margin: "0 auto",
              }}
            >
              {brandChar}
            </div>
          )}

          <button
            onClick={onToggleCollapsed}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: `1px solid ${T.line}`,
              background: T.soft,
              color: T.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              flexShrink: 0,
            }}
          >
            {collapsed ? "❯" : "❮"}
          </button>
        </div>

        {/* 快速新建按钮 */}
        <div style={{ padding: collapsed ? "10px 8px" : "12px 14px 6px" }}>
          <button
            onClick={onNewPlan}
            style={{
              width: "100%",
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: collapsed ? "8px 0" : "8px 12px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 2px 6px rgba(74,124,111,0.25)",
              transition: "all 0.15s ease",
            }}
            title={t("home.newTask", "新建学习计划")}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
            {!collapsed && <span>{t("home.newTask", "新学习目标")}</span>}
          </button>
        </div>

        {/* 导航菜单项 */}
        <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                title={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "space-between",
                  gap: 10,
                  padding: collapsed ? "9px 0" : "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: isActive ? T.soft : "transparent",
                  color: isActive ? T.accent : T.ink,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13.5,
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: isActive ? T.accent : T.soft,
                      color: isActive ? "#fff" : T.muted,
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 活跃学习计划子列表 (Collapsible when expanded) */}
        {!collapsed && (
          <div
            style={{
              padding: "10px 14px 4px",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflowY: "auto",
              minHeight: 80,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              {t("nav.allPlansHeader", "进行中计划")} ({tasks.length})
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {tasks.length === 0 ? (
                <div style={{ fontSize: 11.5, color: T.muted, padding: "4px 8px" }}>
                  {t("nav.noPlans", "暂无学习计划")}
                </div>
              ) : (
                tasks.slice(0, 8).map((t) => {
                  const subtasks = t.subtasks || [];
                  const done = subtasks.filter((s) => s.completed).length;
                  const total = subtasks.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <div
                      key={t.id}
                      onClick={() => onSelectTask(t.id)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontSize: 12.5,
                        color: T.ink,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = T.soft;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {t.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: T.muted,
                          fontFamily: "var(--font-geist-mono), monospace",
                          flexShrink: 0,
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部工具与用户身份 */}
      <div
        style={{
          borderTop: `1px solid ${T.line}`,
          padding: collapsed ? "10px 6px" : "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          background: T.soft,
        }}
      >
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          title={t("nav.quickSearch", "打开指令控制台 (Cmd+K)")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            gap: 8,
            padding: "6px 8px",
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 7,
            fontSize: 12,
            color: T.muted,
            cursor: "pointer",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>⌘</span>
            {!collapsed && <span>{t("nav.quickSearch", "指令与搜索")}</span>}
          </div>
          {!collapsed && (
            <kbd
              style={{
                fontSize: 10,
                background: T.soft,
                padding: "1px 4px",
                borderRadius: 3,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              ⌘K
            </kbd>
          )}
        </button>

        {/* 语言选择与主题切换与用户头像 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
          {!collapsed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setThemeId(themeId === "linear" ? "sage" : "linear")}
                title={themeId === "linear" ? t("nav.toggleThemeSage", "切换至竹青浅色") : t("nav.toggleThemeDark", "切换至夜幕深色")}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "4px 6px",
                  borderRadius: 6,
                  color: T.muted,
                }}
              >
                {themeId === "linear" ? t("nav.themeDark", "🌙 暗夜") : t("nav.themeSage", "🍃 竹青")}
              </button>
              <LanguageSwitcher />
            </div>
          ) : null}

          <div style={{ flex: collapsed ? 1 : undefined, display: "flex", justifyContent: "center" }}>
            <UserBadge />
          </div>
        </div>
      </div>
    </aside>
  );
}
