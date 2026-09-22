"use client";

interface SubtaskActionListProps {
  items: string[];
}

/**
 * 详情面板的行动项列表（§3 屏二 `.acts`）：
 * 十进制前导零序号由 React 索引给出，不再依赖 CSS counter。
 */
export function SubtaskActionList({ items }: SubtaskActionListProps) {
  return (
    <ol className="flex flex-col gap-[9px]">
      {items.map((a, i) => (
        <li key={`${a}-${i}`} className="flex gap-2.5 text-[13.5px] leading-[21px] text-text-2">
          <span className="shrink-0 pt-[3px] font-mono text-[10px] font-bold tracking-[.05em] text-text-3">
            {String(i + 1).padStart(2, "0")}
          </span>
          {a}
        </li>
      ))}
    </ol>
  );
}
