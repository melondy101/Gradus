"use client";

import React from "react";
import { Tag as TagIcon, X } from "lucide-react";
import { getTagColor } from "@/lib/task-tags";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";

export interface SideTagFilterProps {
  availableTags: Array<{ tag: string; count: number }>;
  selectedTag: string | null;
  onSelectTag?: (tag: string | null) => void;
  totalPlansCount: number;
  /** 侧栏部件收起时只保留标题行与已选标签摘要 */
  compact?: boolean;
}

/** 单行筛选项：30px 高 / radius 10 / 选中态铺一层淡黄 */
const ROW =
  "flex h-[30px] w-full items-center justify-between gap-1.5 rounded-[10px] border px-2 text-left text-xs";
const COUNT =
  "shrink-0 rounded-full border border-bd-card bg-card px-[5px] py-[2px] font-mono text-[10px] font-bold leading-none text-text-2";

/**
 * 标签筛选区 —— 能力与 id（#tag-filter-all / #tag-filter-<tag> / #tag-filter-clear）
 * 全部保留，外观与本周进度部件同族：12px 圆角描边卡 + 浅奶油底。
 */
export function SideTagFilter({
  availableTags,
  selectedTag,
  onSelectTag,
  totalPlansCount,
  compact = false,
}: SideTagFilterProps) {
  const rowClass = (selected: boolean) =>
    cn(
      ROW,
      selected
        ? "border-bd-check bg-accent-soft font-semibold text-ink"
        : "border-transparent font-medium text-text-2 hover:bg-cream"
    );

  return (
    <section
      className="mt-3 flex flex-col gap-1 rounded-field border border-bd-card bg-cream-light p-3"
      aria-label="按标签筛选任务"
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <TagIcon size={12} aria-hidden className="shrink-0 text-text-2" />
          <Eyebrow kind="label" className="mb-0">
            标签筛选
          </Eyebrow>
        </div>

        {selectedTag ? (
          <button
            type="button"
            id="tag-filter-clear"
            onClick={() => onSelectTag?.(null)}
            title="清除标签过滤"
            className="flex items-center gap-[3px] rounded-[6px] px-1.5 py-0.5 text-text-2 transition-colors duration-[.16s] hover:bg-cream"
          >
            <X size={11} aria-hidden className="text-accent" />
            <Mono className="text-[10px]">全部</Mono>
          </button>
        ) : (
          <Mono className="text-[10px] text-text-2">{availableTags.length}</Mono>
        )}
      </div>

      {/* 部件收起时也要看清当前过滤条件 */}
      {compact && selectedTag ? <Mono className="text-ink">{selectedTag}</Mono> : null}

      {compact ? null : (
        <>
          <button
            type="button"
            id="tag-filter-all"
            onClick={() => onSelectTag?.(null)}
            title="查看全部任务"
            className={rowClass(selectedTag === null)}
          >
            <span className="min-w-0 truncate">全部任务</span>
            <span className={COUNT}>{totalPlansCount}</span>
          </button>

          {availableTags.length > 0 ? (
            availableTags.map(({ tag, count }) => {
              const isSelected = selectedTag === tag;
              const dot = getTagColor(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  id={`tag-filter-${tag}`}
                  onClick={() => onSelectTag?.(isSelected ? null : tag)}
                  title={`按标签「${tag}」筛选`}
                  className={rowClass(isSelected)}
                >
                  <span className="flex min-w-0 items-center gap-[7px]">
                    <span
                      aria-hidden
                      className="size-[7px] shrink-0 rounded-full"
                      style={{ background: dot }}
                    />
                    <span className="min-w-0 truncate">{tag}</span>
                  </span>
                  <span className={COUNT}>{count}</span>
                </button>
              );
            })
          ) : (
            <p className="px-0.5 pb-0.5 pt-1.5 text-[11px] leading-[1.5] text-text-2">
              新建任务时打上『编程』『文学』『理科』等标签，即可在此分类过滤
            </p>
          )}
        </>
      )}
    </section>
  );
}
