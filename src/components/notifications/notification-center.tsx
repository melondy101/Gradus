"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Trash2,
  Sparkles,
  Crown,
  Info,
  CheckCircle2,
} from "lucide-react";
import {
  fetchNotifications,
  markNotificationRead,
  clearNotifications,
} from "@/lib/api/notifications";
import type { Notification } from "@/lib/db/schema";
import { useEazo } from "@/lib/eazo-shim";

function formatRelativeTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} 小时前`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} 天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

interface NotificationCenterProps {
  collapsed?: boolean;
}

interface PopoverPosition {
  left: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
  width: number;
}

export function NotificationCenter({ collapsed = false }: NotificationCenterProps) {
  const user = useEazo((s) => s.auth.user);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);

  const loadData = useCallback(() => {
    if (!user?.id) return;
    fetchNotifications()
      .then((res) => {
        if (res?.ok) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user?.id, loadData]);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const updatePopoverPosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 12;
    const width = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding
    );
    const shouldOpenAbove = rect.top >= 240;

    setPopoverPosition(
      shouldOpenAbove
        ? {
            left,
            bottom: Math.max(viewportPadding, window.innerHeight - rect.top + 8),
            maxHeight: Math.max(160, rect.top - viewportPadding * 2),
            width,
          }
        : {
            left,
            top: rect.bottom + 8,
            maxHeight: Math.max(160, window.innerHeight - rect.bottom - viewportPadding),
            width,
          }
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  const handleMarkAllRead = async () => {
    try {
      const res = await markNotificationRead(undefined, true);
      if (res.ok) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // ignore
    }
  };

  const handleMarkSingleRead = async (item: Notification) => {
    if (!item.isRead) {
      try {
        const res = await markNotificationRead(item.id);
        if (res.ok) {
          setNotifications(res.notifications);
          setUnreadCount(res.unreadCount);
        }
      } catch {
        // ignore
      }
    }
    if (item.link) {
      router.push(item.link);
      setOpen(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("确定清空所有通知吗？")) return;
    try {
      const res = await clearNotifications();
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch {
      // ignore
    }
  };

  const filteredList = notifications.filter((n) => (filter === "unread" ? !n.isRead : true));

  const getIcon = (type: string) => {
    switch (type) {
      case "task":
        return <Sparkles size={14} className="text-amber-500" />;
      case "membership":
        return <Crown size={14} className="text-yellow-500" />;
      case "achievement":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      default:
        return <Info size={14} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id="btn-notification-trigger"
        onClick={() => {
          setOpen(!open);
          if (!open) loadData();
        }}
        aria-expanded={open}
        title="站内消息通知"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          height: 32,
          width: "100%",
          padding: collapsed ? "0" : "0 8px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: open ? "var(--accent-soft)" : "var(--secondary)",
          color: open ? "var(--accent)" : "var(--muted-foreground)",
          cursor: "pointer",
          fontSize: 12,
          position: "relative",
          transition: "all 0.14s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ position: "relative" }}>
            <Bell size={14} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--accent)",
                  boxShadow: "0 0 0 1.5px var(--card)",
                }}
              />
            )}
          </div>
          {!collapsed && <span>消息通知</span>}
        </div>
        {!collapsed && unreadCount > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 5px",
              borderRadius: 99,
              background: "var(--accent)",
              color: "var(--ink)",
              lineHeight: 1,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Panel */}
      {open && popoverPosition && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panelRef}
          id="notification-center-panel"
          style={{
            position: "fixed",
            top: popoverPosition.top,
            bottom: popoverPosition.bottom,
            left: popoverPosition.left,
            width: popoverPosition.width,
            maxHeight: Math.min(420, popoverPosition.maxHeight),
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column",
            zIndex: 250,
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--sidebar)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                站内通知
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    background: "var(--accent-soft)",
                    color: "var(--accent-ink)",
                    padding: "1px 6px",
                    borderRadius: 99,
                  }}
                >
                  {unreadCount} 未读
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="全部标为已读"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    color: "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    fontSize: 11,
                  }}
                >
                  <Check size={12} />
                  <span>已读</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClear}
                  title="清空通知"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                    color: "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: "flex",
              padding: "4px 8px",
              gap: 4,
              borderBottom: "1px solid var(--border)",
              background: "var(--secondary)",
            }}
          >
            <button
              onClick={() => setFilter("all")}
              style={{
                flex: 1,
                padding: "3px 0",
                fontSize: 11,
                fontWeight: filter === "all" ? 600 : 500,
                color: filter === "all" ? "var(--foreground)" : "var(--muted-foreground)",
                background: filter === "all" ? "var(--card)" : "transparent",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                boxShadow: filter === "all" ? "var(--shadow-sm)" : "none",
              }}
            >
              全部 ({notifications.length})
            </button>
            <button
              onClick={() => setFilter("unread")}
              style={{
                flex: 1,
                padding: "3px 0",
                fontSize: 11,
                fontWeight: filter === "unread" ? 600 : 500,
                color: filter === "unread" ? "var(--foreground)" : "var(--muted-foreground)",
                background: filter === "unread" ? "var(--card)" : "transparent",
                borderRadius: 4,
                border: "none",
                cursor: "pointer",
                boxShadow: filter === "unread" ? "var(--shadow-sm)" : "none",
              }}
            >
              未读 ({unreadCount})
            </button>
          </div>

          {/* List */}
          <div
            style={{
              overflowY: "auto",
              maxHeight: 300,
              padding: "4px 0",
            }}
          >
            {filteredList.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  color: "var(--muted-foreground)",
                  fontSize: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Bell size={24} style={{ opacity: 0.3 }} />
                <span>暂无{filter === "unread" ? "未读" : ""}消息通知</span>
              </div>
            ) : (
              filteredList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkSingleRead(item)}
                  style={{
                    padding: "8px 12px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    transition: "background 0.12s ease",
                    background: item.isRead ? "transparent" : "var(--accent-soft)",
                    borderBottom: "1px solid var(--border)",
                  }}
                  className="hover:bg-muted/40"
                >
                  <div
                    style={{
                      marginTop: 2,
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {getIcon(item.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: item.isRead ? 600 : 700,
                          color: "var(--foreground)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--muted-foreground)",
                          flexShrink: 0,
                        }}
                      >
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        margin: "2px 0 0",
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        ,
        document.body
      )
        : null}
    </div>
  );
}
