"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { useAppTheme } from "@/components/theme/theme-provider";
import type { ThemeId } from "@/lib/theme-config";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { useEazo } from "@/lib/eazo-shim";
import { isAdminUser } from "@/lib/auth/admin-shared";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  subtasks: SubtaskWithTask[];
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onNewPlan: () => void;
  onSwitchView: (view: "today" | "plans" | "steps" | "timeline") => void;
}

export function CommandPalette({
  open,
  onClose,
  subtasks,
  onSelectSubtask,
  onNewPlan,
  onSwitchView,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setThemeId } = useAppTheme();
  const user = useEazo((s) => s.auth.user);
  const isAdmin = isAdminUser(user);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Handle global Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Build command and search results
  const q = query.trim().toLowerCase();

  const standardCommands = [
    {
      id: "action-new-plan",
      title: "创建新学习目标与计划",
      category: "快捷操作",
      icon: "✨",
      action: () => {
        onClose();
        onNewPlan();
      },
    },
    {
      id: "action-membership",
      title: "会员中心 · 查看用量配额与特权",
      category: "会员与特权",
      icon: "👑",
      action: () => {
        onClose();
        openMembershipModal("overview");
      },
    },
    {
      id: "action-redeem-code",
      title: "兑换码激活 · 升级会员解锁任务容量",
      category: "会员与特权",
      icon: "🎟️",
      action: () => {
        onClose();
        openMembershipModal("redeem");
      },
    },
    ...(isAdmin
      ? [
          {
            id: "action-manage-codes",
            title: "激活码生成与管理 · 批量制码与配额发放",
            category: "会员与特权",
            icon: "⚡",
            action: () => {
              onClose();
              openMembershipModal("manage");
            },
          },
        ]
      : []),
    {
      id: "view-today",
      title: "切换至：今日聚焦 (Today Focus)",
      category: "视图导航",
      icon: "🌟",
      action: () => {
        onClose();
        onSwitchView("today");
      },
    },
    {
      id: "view-plans",
      title: "切换至：所有计划库 (All Plans)",
      category: "视图导航",
      icon: "📂",
      action: () => {
        onClose();
        onSwitchView("plans");
      },
    },
    {
      id: "view-steps",
      title: "切换至：拾级天梯 (Ascending Steps)",
      category: "视图导航",
      icon: "🪜",
      action: () => {
        onClose();
        onSwitchView("steps");
      },
    },
    {
      id: "view-timeline",
      title: "切换至：时间甘特图 (Timeline)",
      category: "视图导航",
      icon: "📅",
      action: () => {
        onClose();
        onSwitchView("timeline");
      },
    },
    {
      id: "theme-sage",
      title: "切换主题：温润竹青 (Calm Sage)",
      category: "系统设置",
      icon: "🍃",
      action: () => {
        setThemeId("sage" as ThemeId);
        onClose();
      },
    },
    {
      id: "theme-linear",
      title: "切换主题：深邃夜幕 (Linear Dark)",
      category: "系统设置",
      icon: "🌙",
      action: () => {
        setThemeId("linear" as ThemeId);
        onClose();
      },
    },
  ];

  // Filter commands
  const filteredCommands = standardCommands.filter((c) =>
    c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );

  // Search in subtasks
  const matchedSubtasks = q
    ? subtasks
        .filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.taskTitle.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q))
        )
        .slice(0, 8)
        .map((s) => ({
          id: `subtask-${s.id}`,
          title: s.title,
          category: `学习任务 · ${s.taskTitle}`,
          icon: s.completed ? "✓" : "○",
          subtask: s,
          action: () => {
            onClose();
            onSelectSubtask(s);
          },
        }))
    : [];

  const allItems = [...filteredCommands, ...matchedSubtasks];

  // Keyboard list navigation
  const handleKeyInPalette = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(allItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(allItems.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: "12vh",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 580,
            background: T.surface,
            border: `1px solid ${T.line}`,
            borderRadius: 14,
            boxShadow: "0 20px 48px rgba(0,0,0,0.18)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 搜索输入栏 */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 16, color: T.muted }}>🔍</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyInPalette}
              placeholder="输入操作指令、搜索任务或切换视图..."
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 15,
                color: T.ink,
                fontFamily: "inherit",
              }}
            />
            <kbd
              style={{
                fontSize: 11,
                background: T.soft,
                padding: "2px 6px",
                borderRadius: 4,
                color: T.muted,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              ESC
            </kbd>
          </div>

          {/* 结果列表 */}
          <div
            style={{
              maxHeight: 360,
              overflowY: "auto",
              padding: "8px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {allItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    background: isSelected ? T.soft : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: isSelected ? 600 : 500,
                        color: T.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: T.muted,
                      background: isSelected ? "rgba(0,0,0,0.05)" : "transparent",
                      padding: "2px 6px",
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    {item.category}
                  </span>
                </div>
              );
            })}

            {allItems.length === 0 && (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: T.muted,
                  fontSize: 13,
                }}
              >
                未找到相关指令或任务
              </div>
            )}
          </div>

          {/* 底部快捷键提示 */}
          <div
            style={{
              padding: "8px 16px",
              background: T.soft,
              borderTop: `1px solid ${T.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: T.muted,
            }}
          >
            <span>↑↓ 导航 · ↵ 确认选择</span>
            <span>Raycast-style Command Bar</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
