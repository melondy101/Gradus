"use client";

/**
 * 筛选胶囊 —— `<Chip>` 的选中态（墨底反白，符合「黄色只做点缀、墨色承担层级」）。
 * 尺寸比示例 chip 更紧凑（12px 字 / 5×12 内距），与原 `.chip` + 内联覆盖一致。
 */

import { Chip } from "@/components/ui/chip";

interface Props {
  id?: string;
  active: boolean;
  label: string;
  title?: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

export function FilterChip({ id, active, label, title, onClick, icon }: Props) {
  return (
    <Chip
      id={id}
      selected={active}
      onClick={onClick}
      title={title}
      className={active ? "gap-[5px] px-3 py-[5px] text-xs font-bold" : "gap-[5px] px-3 py-[5px] text-xs"}
    >
      {icon}
      {label}
    </Chip>
  );
}
