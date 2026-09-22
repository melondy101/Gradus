"use client";

/**
 * 行内悬停快捷操作按钮（顺延 / 跳过 / 删除等）—— `<IconButton>` 的 24px 方角变体，
 * 与复选框同一套 radius 12 / 细描边语言（§1.4）。
 */

import { IconButton } from "@/components/ui/icon-button";

export function MiniActionButton({ label, onClick, children }: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      aria-label={label}
      title={label}
      onClick={onClick}
      className="size-6 rounded-field text-[12px]"
    >
      {children}
    </IconButton>
  );
}
