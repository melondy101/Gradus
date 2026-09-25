"use client";

import React from "react";
import { Command } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ThemeToggle } from "./theme-toggle";

interface SideFooterProps {
  onOpenCommandPalette: () => void;
}

/** 侧栏底部功能簇的一行：34px 高 / radius 10 / 细描边浅底 */
const ROW =
  "flex h-[34px] w-full items-center gap-[7px] rounded-[10px] border border-bd-card px-2.5 text-left text-xs font-semibold text-text-2 transition-colors duration-[.16s] hover:bg-cream hover:text-ink";

/**
 * 侧边栏底部功能簇：消息通知 / 命令面板 / 唯一的明暗切换。
 * 沉底由 icon-rail 的底部容器（margin-top:auto）负责，这里只负责纵向堆叠。
 */
export function SideFooter({ onOpenCommandPalette }: SideFooterProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* 站内消息（组件自带 popover 与 30s 轮询；false = 整行文案态） */}
      <NotificationCenter collapsed={false} id="nav-btn-notifications" />

      <div className="flex items-center gap-2">
        <button type="button" id="nav-btn-command-palette" onClick={onOpenCommandPalette}
          title="命令菜单 (⌘K)" className={ROW + " min-w-0 flex-1"}>
          <Command size={14} aria-hidden className="shrink-0 text-text-2" />
          <span>搜索 / 命令</span>
          <kbd className="ml-auto shrink-0 rounded-[5px] border border-bd-card px-[5px] py-0.5 font-mono text-[9.5px] font-medium tracking-[.05em] text-text-2">⌘K</kbd>
        </button>
        <ThemeToggle />
      </div>
    </div>
  );
}
