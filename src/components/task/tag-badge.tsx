"use client";

import { X } from "lucide-react";
import { Tag } from "@/components/ui/badge";
import { cn } from "@/utils/utils";

interface TagBadgeProps {
  tag: string;
  size?: "xs" | "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

/** 设计稿 `.tag` 三档尺寸：sm 即 ui <Tag> 的默认规格 */
const SIZE = {
  xs: "text-[9px] px-[6px] py-[2px]",
  sm: "",
  md: "text-[11.5px] px-[11px] py-[5px]",
} as const;

/**
 * 标签胶囊（§1.4 `.tag`：等宽小字 + 奶油底 + 细描边）。
 * 激活态换成墨底奶油字，与侧边栏激活态同一语言；不按标签名分色，
 * 保持「近黑文字 + 单一点缀黄」的色彩规则。
 */
export function TagBadge({
  tag,
  size = "sm",
  onRemove,
  onClick,
  active = false,
}: TagBadgeProps) {
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[5px] whitespace-nowrap",
        SIZE[size],
        active && "border-ink bg-ink text-cream",
        onClick && "cursor-pointer",
      )}
    >
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`移除标签 ${tag}`}
          className="inline-flex leading-none"
        >
          <X size={size === "xs" ? 9 : 11} />
        </button>
      )}
    </Tag>
  );
}
