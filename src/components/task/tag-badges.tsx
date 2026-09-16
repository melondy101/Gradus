"use client";

import React, { useState } from "react";
import { Tag as TagIcon, X, Plus } from "lucide-react";
import { PRESET_TAGS, getTagStyle, cleanTag } from "@/lib/task-tags";
import { T } from "@/lib/design-tokens";

interface TagBadgeProps {
  tag: string;
  size?: "xs" | "sm" | "md";
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export function TagBadge({
  tag,
  size = "sm",
  onRemove,
  onClick,
  active = false,
}: TagBadgeProps) {
  const style = getTagStyle(tag);

  const padding =
    size === "xs"
      ? "1px 6px"
      : size === "sm"
      ? "2px 8px"
      : "4px 10px";

  const fontSize =
    size === "xs" ? 10 : size === "sm" ? 11 : 12.5;

  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: 999,
        background: active ? style.text : style.bg,
        color: active ? "#FFFFFF" : style.text,
        border: `1px solid ${active ? style.text : style.border}`,
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: size === "xs" ? 4 : 5,
          height: size === "xs" ? 4 : 5,
          borderRadius: "50%",
          background: active ? "#FFFFFF" : style.dot,
          flexShrink: 0,
        }}
      />
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`移除标签 ${tag}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
            marginLeft: 2,
            cursor: "pointer",
            color: active ? "rgba(255,255,255,0.8)" : style.text,
            lineHeight: 1,
          }}
        >
          <X size={size === "xs" ? 10 : 12} />
        </button>
      )}
    </span>
  );
}

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  readOnly?: boolean;
}

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
    if (!tags.includes(cleaned)) {
      onChange([...tags, cleaned]);
    }
    setInputVal("");
    setIsAdding(false);
  };

  const handleTogglePreset = (preset: string) => {
    if (tags.includes(preset)) {
      onChange(tags.filter((t) => t !== preset));
    } else {
      onChange([...tags, preset]);
    }
  };

  const handleRemove = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: T.muted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <TagIcon size={12} style={{ color: T.accent }} />
          {label}
        </span>
        {!readOnly && (
          <span style={{ fontSize: 11, color: T.muted }}>
            点击快速打标或输入自定义标签
          </span>
        )}
      </div>

      {/* 已选标签列表 */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          minHeight: 28,
        }}
      >
        {tags.length === 0 && (
          <span style={{ fontSize: 12, color: T.muted, fontStyle: "italic" }}>
            暂未添加标签
          </span>
        )}
        {tags.map((t) => (
          <TagBadge
            key={t}
            tag={t}
            size="sm"
            onRemove={readOnly ? undefined : () => handleRemove(t)}
          />
        ))}

        {!readOnly && isAdding && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              borderRadius: 999,
              border: `1px solid ${T.accent}`,
              background: "var(--card, #fff)",
            }}
          >
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
              placeholder="输入标签名..."
              maxLength={20}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 11,
                width: 90,
                color: T.ink,
              }}
            />
            <button
              type="button"
              onClick={() => handleAddCustom(inputVal)}
              style={{
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <Plus size={10} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setInputVal("");
              }}
              style={{
                background: "none",
                border: "none",
                color: T.muted,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {!readOnly && !isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              padding: "2px 8px",
              borderRadius: 999,
              border: `1px dashed ${T.line}`,
              background: "transparent",
              color: T.muted,
              fontSize: 11,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.accent;
              e.currentTarget.style.color = T.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.line;
              e.currentTarget.style.color = T.muted;
            }}
          >
            <Plus size={11} />
            <span>添加</span>
          </button>
        )}
      </div>

      {/* 预设标签快捷选择 */}
      {!readOnly && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 5,
            paddingTop: 4,
          }}
        >
          <span style={{ fontSize: 11, color: T.muted, marginRight: 2 }}>
            常用：
          </span>
          {PRESET_TAGS.map((preset) => {
            const isSelected = tags.includes(preset);
            const style = getTagStyle(preset);
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handleTogglePreset(preset)}
                style={{
                  padding: "2px 7px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: isSelected ? 600 : 500,
                  border: `1px solid ${isSelected ? style.border : T.line}`,
                  background: isSelected ? style.bg : "transparent",
                  color: isSelected ? style.text : T.muted,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span>{isSelected ? "✓" : "+"}</span>
                <span>{preset}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
