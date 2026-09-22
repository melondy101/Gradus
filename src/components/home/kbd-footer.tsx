"use client";

/**
 * 底部快捷键提示条（移动端隐藏）：日期 + 共用 <Kbd> 键帽 + 重新观看引导入口。
 */

import { getResolvedLocale } from "@/i18n";
import { Mono } from "@/components/ui/eyebrow";
import { Kbd } from "./kbd";
import { TourHelpButton } from "./onboarding-tour";

const KEYS: Array<[string, string]> = [
  ["⌘K", "指令菜单"],
  ["N", "新建"],
  ["Space", "标记完成"],
  ["↑↓", "移动光标"],
];

export function KbdFooter() {
  const todayStr = new Date().toLocaleDateString(getResolvedLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <footer className="hidden shrink-0 items-center justify-between gap-4 border-t border-bd-card bg-card px-5 py-[7px] sm:flex">
      <Mono className="text-text-3">{todayStr}</Mono>
      <div className="flex items-center gap-3.5">
        <TourHelpButton />
        {KEYS.map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <Kbd>{key}</Kbd>
            <Mono className="text-[10px] text-text-3">{label}</Mono>
          </span>
        ))}
      </div>
    </footer>
  );
}
