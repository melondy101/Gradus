"use client";

import React from "react";
import { Command } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { cn } from "@/utils/utils";
import { ThemeToggle } from "./theme-toggle";

interface SideFooterProps {
  onOpenCommandPalette: () => void;
  /** 侧栏折叠为图标栏时：三个入口全部收成居中图标，纵向堆叠 */
  compact?: boolean;
}

/** 侧栏底部功能簇的一行：34px 高 / radius 10 / 细描边浅底 */
const ROW =
  "flex h-[34px] w-full items-center gap-[7px] rounded-[10px] border border-bd-card px-2.5 text-left text-xs font-semibold text-text-2 transition-colors duration-[.16s] hover:bg-cream hover:text-ink";

/**
 * 侧边栏底部功能簇：消息通知 / 命令面板 / 唯一的明暗切换。
 * 沉底由 icon-rail 的底部容器（margin-top:auto）负责，这里只负责纵向堆叠。
 */
export function SideFooter({ onOpenCommandPalette, compact = false }: SideFooterProps) {
  return (
    <div className={compact ? "flex flex-col items-stretch gap-2" : "flex flex-col gap-2"}>
      {/* 站内消息（组件自带 popover 与 30s 轮询；collapsed = 仅图标态） */}
      <NotificationCenter collapsed={compact} />

      <div className={compact ? "flex flex-col items-stretch gap-2" : "flex items-center gap-2"}>
        <button type="button" id="nav-btn-command-palette" onClick={onOpenCommandPalette}
          title="命令菜单 (⌘K)" className={cn(ROW, compact ? "justify-center px-0" : "min-w-0 flex-1")}>
          <Command size={14} aria-hidden className="shrink-0 text-text-2" />
          {compact ? null : <span>搜索 / 命令</span>}
          {compact ? null : (
            <kbd className="ml-auto shrink-0 rounded-[5px] border border-bd-card px-[5px] py-0.5 font-mono text-[9.5px] font-medium tracking-[.05em] text-text-2">⌘K</kbd>
          )}
        </button>
        {compact ? (
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
        ) : (
          <ThemeToggle />
        )}
      </div>
    </div>
  );
}
