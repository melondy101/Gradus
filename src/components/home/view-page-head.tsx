"use client";

/**
 * 视图页头（《品牌与产品设计说明》§3 屏一，原 app.css `.main__head` `.main__tools`
 * `.main__search` `.icon-btn` `.avatar` 与 base.css `.h-page` `.eyebrow` `.mono`）。
 * 搜索按钮复用 ⌘K 指令面板（同一能力，不新建第二套搜索）；通知为站内消息中心。
 */

import { ChartNoAxesCombined, Search } from "lucide-react";
import { getResolvedLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { Tag } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/notifications/notification-center";

interface Props {
  title: string;
  /** 眉题（标题上方），如「TODAY」 */
  eyebrow?: string;
  onOpenPalette: () => void;
  /** 生成学习周报（有 stats 时屏一显示该按钮） */
  onOpenReport?: () => void;
}

/** 「2026.09.21 · 第 39 周 · 周日」——日期、ISO 周次与星期，全部由当前时间算出 */
function todayLine(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  const simple = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - simple.getTime()) / 86400000 + simple.getDay() + 1) / 7);
  const weekday = now.toLocaleDateString(getResolvedLocale(), { weekday: "long" });
  return `${date} · 第 ${week} 周 · ${weekday}`;
}

export function ViewPageHead({ title, eyebrow, onOpenPalette, onOpenReport }: Props) {
  return (
    <header className="mb-3.5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <Heading level={2} spec="page" className="mt-2">
          {title}
        </Heading>
        <Mono className="mt-1.5 block truncate">{todayLine()}</Mono>
      </div>

      <div className="flex flex-none items-center gap-2.5">
        {onOpenReport && (
          <Button variant="outline" size="xs" className="h-10" onClick={onOpenReport}>
            <ChartNoAxesCombined size={14} />
            <span className="hidden sm:inline">学习周报</span>
            <span className="sm:hidden">周报</span>
          </Button>
        )}

        {/* 搜索触发器：与 ui/SearchField 同一套 utility（真正的检索在 ⌘K 面板里）。
            移动端顶栏已有搜索图标，250px 宽的输入框只在中断以上出现。 */}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-label="搜索任务、子任务、资源"
          className="hidden h-10 items-center gap-2 rounded-field border border-bd-card bg-white px-[13px] text-left transition-[border-color,box-shadow] duration-[.16s] hover:border-ink focus-visible:border-ink focus-visible:shadow-[0_0_0_3px_rgba(245,197,24,.24)] focus-visible:outline-none md:flex md:w-[250px]"
        >
          <Search size={15} className="shrink-0 text-text-3" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-text-3">
            搜索任务、子任务、资源
          </span>
          <Tag className="px-[5px] py-px text-[10px]">⌘K</Tag>
        </button>

        <NotificationCenter />
      </div>
    </header>
  );
}
