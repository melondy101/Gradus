"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { PRESET_TAGS, cleanTag } from "@/lib/task-tags";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { TagBadge } from "./tag-badge";

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  readOnly?: boolean;
}

/**
 * 标签编辑器：已选标签 + 自定义输入 + 预设快捷打标。
 * 预设与「添加」走 ui <Chip>（浅奶油药丸），已选走 <TagBadge>，
 * 交互与回调保持不变。
 */
export function TagEditor({
  tags,
  onChange,
  label = "任务标签",
  readOnly = false,
}: TagEditorProps) {
  const [inputVal, setInputVal] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCustom = (val: string) => {
    const cleaned = cleanTag(val);
    if (!cleaned) return;
    if (!tags.includes(cleaned)) onChange([...tags, cleaned]);
    setInputVal("");
    setIsAdding(false);
  };

  const handleTogglePreset = (preset: string) => {
    if (tags.includes(preset)) onChange(tags.filter((t) => t !== preset));
    else onChange([...tags, preset]);
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-1.5">
        <span className="inline-flex items-center gap-1.5">
          <TagIcon size={12} aria-hidden className="text-accent-ink" />
          <Eyebrow kind="label" className="mb-0">
            {label}
          </Eyebrow>
        </span>
        {!readOnly && <Mono className="text-text-3">点击预设快速打标，或输入自定义标签</Mono>}
      </div>

      <ChipRow>
        {tags.length === 0 && <Mono className="text-text-3">暂未添加标签</Mono>}
        {tags.map((t) => (
          <TagBadge
            key={t}
            tag={t}
            size="sm"
            onRemove={readOnly ? undefined : () => handleRemove(t)}
          />
        ))}

        {!readOnly && isAdding && (
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-ink bg-card px-[9px] py-[3px]">
            <input
              type="text"
              autoFocus
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustom(inputVal);
                } else if (e.key === "Escape") {
                  setIsAdding(false);
                  setInputVal("");
                }
              }}
              placeholder="标签名"
              maxLength={20}
              className="w-[90px] border-0 bg-transparent text-body-sm text-ink outline-none"
            />
            <button type="button" onClick={() => handleAddCustom(inputVal)} aria-label="添加标签">
              <Plus size={12} />
            </button>
            <button
              type="button"
              aria-label="取消输入"
              onClick={() => {
                setIsAdding(false);
                setInputVal("");
              }}
            >
              <X size={12} />
            </button>
          </span>
        )}

        {!readOnly && !isAdding && (
          <Chip
            className="inline-flex items-center gap-1 border-dashed px-[11px] py-[3px] text-xs"
            onClick={() => setIsAdding(true)}
          >
            <Plus size={11} />
            添加
          </Chip>
        )}
      </ChipRow>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Mono className="text-text-3">常用</Mono>
          {PRESET_TAGS.map((preset) => {
            const isSelected = tags.includes(preset);
            return (
              <Chip
                key={preset}
                selected={isSelected}
                className="inline-flex items-center gap-[5px] px-[11px] py-[4px] text-xs"
                onClick={() => handleTogglePreset(preset)}
              >
                {isSelected ? <X size={10} /> : <Plus size={10} />}
                {preset}
              </Chip>
            );
          })}
        </div>
      )}
    </div>
  );
}
