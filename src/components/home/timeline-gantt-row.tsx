"use client";

import React from "react";
import { motion } from "framer-motion";
import { T, BLOOM_CONFIG } from "@/lib/design-tokens";
import { fmtShortDate } from "@/components/task/task-dates";
import type { SubtaskWithTask } from "@/lib/api/tasks";

export interface TimelineGanttRowProps {
  item: SubtaskWithTask;
  dayCount: number;
  /** 今天在窗口内的列下标（0 起）；-1 表示今天不在窗口内 */
  todayIdx: number;
  /** 条形起始列（0 起）；null 表示排期未定（无 absolute 日期） */
  startIdx: number | null;
  duration: number;
  zebra: boolean;
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
}

/** 甘特单行：左侧任务信息 + 右侧按日对齐的条柱。布局消费数据层 absolute 日期派生的列下标。 */
export function TimelineGanttRow({
  item,
  dayCount,
  todayIdx,
  startIdx,
  duration,
  zebra,
  onSelectSubtask,
  onToggleSubtask,
}: TimelineGanttRowProps) {
  const bloom = BLOOM_CONFIG[(item.bloomLevel || 1) as keyof typeof BLOOM_CONFIG] || BLOOM_CONFIG[1];
  const start = item.absoluteStart ? new Date(item.absoluteStart) : null;
  const end = item.absoluteEnd ? new Date(item.absoluteEnd) : null;
  const dateLabel = start && end ? `${fmtShortDate(start)} → ${fmtShortDate(end)} · 共${duration}天` : "排期未定";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `240px repeat(${dayCount}, minmax(36px, 1fr))`,
        borderBottom: `1px solid ${T.line}`,
        alignItems: "center",
        minHeight: 46,
        transition: "background 0.1s",
        background: zebra ? `${T.soft}33` : "transparent",
      }}
    >
      {/* 左侧任务信息 */}
      <div
        onClick={() => onSelectSubtask(item)}
        style={{
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSubtask(item);
          }}
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            border: `1.5px solid ${item.completed ? bloom.color : T.line}`,
            background: item.completed ? "var(--ink)" : "transparent",
            color: "var(--cream)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {item.completed ? "✓" : ""}
        </button>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: item.completed ? T.muted : T.ink,
              textDecoration: item.completed ? "line-through" : "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.title}
          </div>
          <div style={{ fontSize: 10, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.taskTitle}
          </div>
        </div>
      </div>

      {/* 右侧甘特条柱区域 */}
      <div
        style={{
          gridColumn: `2 / span ${dayCount}`,
          display: "grid",
          gridTemplateColumns: `repeat(${dayCount}, minmax(36px, 1fr))`,
          height: "100%",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* 今日基准列（与表头同一语言：点缀黄淡底） */}
        {todayIdx >= 0 && (
          <div
            style={{
              gridColumn: todayIdx + 1,
              alignSelf: "stretch",
              background: "var(--accent)",
              opacity: 0.12,
              zIndex: 0,
              pointerEvents: "none",
            }}
          />
        )}

        {startIdx === null ? (
          <div
            style={{
              gridColumn: `1 / span ${dayCount}`,
              paddingLeft: 12,
              fontSize: 11,
              color: T.muted,
              zIndex: 1,
            }}
          >
            排期未定
          </div>
        ) : (
          <motion.div
            onClick={() => onSelectSubtask(item)}
            whileHover={{ scale: 1.02 }}
            style={{
              gridColumn: `${startIdx + 1} / span ${duration}`,
              background: item.completed ? `${bloom.color}50` : bloom.color,
              borderRadius: 6,
              height: 26,
              margin: "0 4px",
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              color: "var(--card)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: `0 2px 6px ${bloom.color}30`,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              zIndex: 1,
            }}
            title={`${item.title} ${dateLabel}`}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
