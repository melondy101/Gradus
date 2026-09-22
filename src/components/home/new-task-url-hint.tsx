"use client";

/**
 * URL 识别提示卡（新建目标对话框内）。原文案与 i18n key 不变，只把品牌外的
 * 表情符号与旧蓝紫色板换成 lucide 线性图标 + 语义令牌。
 */

import { Tag } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/utils";
import type { UrlHint } from "./new-task-url";

export function NewTaskUrlHint({ hint }: { hint: UrlHint }) {
  const { t } = useTranslation();
  const Icon = hint.Icon;

  return (
    <div className="flex items-start gap-2 rounded-[8px] border border-bd-field bg-cream-light px-2.5 py-[7px]">
      <Icon size={16} className={cn("mt-px shrink-0", hint.canFetch ? "text-ink" : "text-text-2")} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1">
          <Tag className="border-accent-deep bg-accent-soft px-[5px] py-px text-[9.5px] text-accent-ink">
            {t(`newTask.platforms.${hint.type}.label`)}
          </Tag>
          <span className={cn("text-[9.5px] font-semibold", hint.canFetch ? "text-success" : "text-warning")}>
            {hint.canFetch ? t("newTask.willFetch") : t("newTask.needDesc")}
          </span>
        </div>
        <div className="text-[10.5px] leading-[1.35] text-text-2">
          {t(`newTask.platforms.${hint.type}.tip`)}
        </div>
      </div>
    </div>
  );
}
