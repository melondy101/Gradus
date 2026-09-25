"use client";

/**
 * 视图页头（《品牌与产品设计说明》§3 屏一，原 app.css `.main__head` `.main__tools`
 * `.icon-btn` `.avatar` 与 base.css `.h-page` `.eyebrow` `.mono`）。
 *
 * 搜索与通知在此不收口：二者各自只在侧栏底部（桌面）与移动端顶栏保留一个入口，
 * 页头只承担标题、日期和本周独有的「学习周报」。
 */

import { ChartNoAxesCombined } from "lucide-react";
import { getResolvedLocale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

interface Props {
  title: string;
  /** 眉题（标题上方），如「TODAY」 */
  eyebrow?: string;
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

export function ViewPageHead({ title, eyebrow, onOpenReport }: Props) {
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
      </div>
    </header>
  );
}
