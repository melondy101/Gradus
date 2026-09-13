"use client";

import React from "react";
import {
  CalendarDays,
  ListTodo,
  TrendingUp,
  Clock,
  Plus,
  Command,
  ChevronLeft,
  ChevronRight,
  Crown,
} from "lucide-react";
import { UserBadge } from "@/components/user-profile/user-badge";
import { ThemeToggle } from "./theme-toggle";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { NotificationCenter } from "@/components/notifications/notification-center";

export type NavView = "today" | "plans" | "steps" | "timeline";

interface IconRailProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  todayPendingCount: number;
  totalPlansCount: number;
  onOpenCommandPalette: () => void;
  onNewPlan: () => void;
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
}: IconRailProps) {
  const navItems = [
    {
      id: "today" as NavView,
      label: "今日聚焦",
      icon: CalendarDays,
      badge: todayPendingCount > 0 ? todayPendingCount : undefined,
    },
    {
      id: "plans" as NavView,
      label: "计划清单",
      icon: ListTodo,
      badge: totalPlansCount > 0 ? totalPlansCount : undefined,
    },
    {
      id: "steps" as NavView,
      label: "拾级天梯",
      icon: TrendingUp,
    },
    {
      id: "timeline" as NavView,
      label: "甘特时间轴",
      icon: Clock,
    },
  ];

  return (
    <>
      {/* ── Desktop / Tablet Sidebar (Icon Rail) ── */}
      <aside
        className="hidden sm:flex flex-col justify-between"
        style={{
          width: collapsed ? 56 : 220,
          height: "100%",
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
          transition: "width 220ms var(--ease-out)",
          flexShrink: 0,
          overflow: "hidden",
          userSelect: "none",
          zIndex: 30,
        }}
      >
        {/* Top: Logo & New Task Button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 10px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              height: 38,
              padding: collapsed ? "0" : "0 6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <GradusLogo size={32} />
              {!collapsed && (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--foreground)",
                      fontFamily: "var(--font-outfit), Outfit, sans-serif",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                    }}
                  >
                    拾级 · Gradus
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    Warm Precision
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={onToggleCollapsed}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="折叠侧边栏"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {/* New Plan Quick Action */}
          <button
            id="nav-btn-new-plan"
            onClick={onNewPlan}
            title="新建学习任务 (N)"
            style={{
              width: "100%",
              height: 36,
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              padding: collapsed ? "0" : "0 12px",
              fontWeight: 600,
              fontSize: 13,
              fontFamily: "var(--font-dm-sans), sans-serif",
              transition: "transform 120ms, opacity 120ms",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Plus size={16} />
            {!collapsed && <span>新建计划</span>}
          </button>

          {/* Navigation Items */}
          <nav id="nav-rail-group" style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {navItems.map((item) => {
              const active = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onSelectView(item.id)}
                  title={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "space-between",
                    height: 38,
                    padding: collapsed ? "0" : "0 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--foreground)",
                    cursor: "pointer",
                    transition: "all 0.14s ease",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {active && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: "0 2px 2px 0",
                          background: "var(--accent)",
                        }}
                      />
                    )}
                    <Icon size={18} style={{ color: active ? "var(--accent)" : "var(--muted-foreground)" }} />
                    {!collapsed && (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: active ? 600 : 500,
                          fontFamily: "var(--font-dm-sans), sans-serif",
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>

                  {!collapsed && item.badge !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "var(--font-jetbrains), monospace",
                        color: active ? "var(--accent)" : "var(--muted-foreground)",
                        background: active ? "var(--card)" : "var(--secondary)",
                        padding: "1px 6px",
                        borderRadius: 99,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Membership, Command Palette, Theme, Profile */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "10px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {/* Notification Center */}
          <NotificationCenter collapsed={collapsed} />

          {/* Membership / Quota Trigger */}
          <button
            onClick={() => openMembershipModal("overview")}
            title="会员中心与配额"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              height: 32,
              padding: collapsed ? "0" : "0 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Crown size={14} style={{ color: "#F59E0B" }} />
              {!collapsed && <span>会员权益 / 兑换</span>}
            </div>
            {!collapsed && (
              <span
                style={{
                  fontSize: 10,
                  padding: "1px 5px",
                  borderRadius: 4,
                  background: "rgba(245, 158, 11, 0.15)",
                  color: "#D97706",
                  fontWeight: 700,
                }}
              >
                PRO
              </span>
            )}
          </button>

          {/* Command Palette Trigger */}
          <button
            onClick={onOpenCommandPalette}
            title="命令菜单 (⌘K)"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              height: 32,
              padding: collapsed ? "0" : "0 8px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--secondary)",
              color: "var(--muted-foreground)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Command size={14} />
              {!collapsed && <span>搜索 / 命令</span>}
            </div>
            {!collapsed && (
              <kbd style={{ fontSize: 10, fontFamily: "var(--font-jetbrains), monospace" }}>⌘K</kbd>
            )}
          </button>

          {/* Theme toggle & expand button */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
              gap: 6,
            }}
          >
            <ThemeToggle />
            {collapsed && (
              <button
                onClick={onToggleCollapsed}
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="展开侧边栏"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* User profile */}
          <div style={{ overflow: "hidden", display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
            <UserBadge />
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Tab Bar (≤640px) ── */}
      <div
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around"
        style={{
          height: 56,
          background: "var(--card)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -2px 10px rgba(0,0,0,0.05)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {navItems.map((item) => {
          const active = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                background: "transparent",
                border: "none",
                color: active ? "var(--accent)" : "var(--muted-foreground)",
                gap: 2,
                cursor: "pointer",
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={18} />
                {item.badge !== undefined && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      background: "var(--accent)",
                      color: "var(--accent-foreground)",
                      fontSize: 9,
                      borderRadius: 99,
                      padding: "0 4px",
                      fontWeight: 700,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={onNewPlan}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            gap: 2,
          }}
        >
          <Plus size={20} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>新建</span>
        </button>
      </div>
    </>
  );
}
