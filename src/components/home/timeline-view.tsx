"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { T, BLOOM_CONFIG } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface TimelineViewProps {
  subtasks: SubtaskWithTask[];
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
  onOpenCalendarSync?: () => void;
}

export function TimelineView({
  subtasks,
  onSelectSubtask,
  onToggleSubtask,
  onOpenCalendarSync,
}: TimelineViewProps) {
  // Sort subtasks by startDay and task
  const sorted = [...subtasks].sort((a, b) => a.startDay - b.startDay);
  const maxDay = Math.max(...sorted.map((s) => s.startDay + s.durationDays), 14);
  const daysArray = Array.from({ length: Math.min(maxDay, 30) }, (_, i) => i + 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "16px 20px 32px" }}>
      {/* 头部说明 */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="font-editorial" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
            时间甘特图与艾宾浩斯复习节点 (Timeline & Spaced Repetition)
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 3 }}>
            色条对应认知层级深度，虚线框为智能算法生成的间隔重复（Spaced Repetition）复习节点
          </div>
        </div>

        {/* 图例与同步按钮 */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.muted }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: T.accent }} />
            <span>常规任务</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: T.muted }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                border: `1.5px dashed #C4841D`,
                background: "rgba(196,132,29,0.1)",
              }}
            />
            <span>复习节点</span>
          </div>

          {onOpenCalendarSync && (
            <button
              onClick={onOpenCalendarSync}
              title="导出与订阅到系统日历"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "var(--secondary)",
                border: `1px solid ${T.line}`,
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: 600,
                color: T.ink,
                cursor: "pointer",
                transition: "all 0.12s ease",
              }}
            >
              <Calendar size={13} style={{ color: T.accent }} />
              <span>同步日历</span>
            </button>
          )}
        </div>
      </div>

      {/* 甘特图容器 */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          overflowX: "auto",
          boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
        }}
      >
        {/* 时间刻度表头 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `240px repeat(${daysArray.length}, minmax(36px, 1fr))`,
            borderBottom: `1px solid ${T.line}`,
            background: T.soft,
            padding: "8px 0",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <div
            style={{
              padding: "0 16px",
              fontSize: 12,
              fontWeight: 600,
              color: T.muted,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            任务 / 计划
          </div>
          {daysArray.map((day) => {
            const isToday = day === 1;
            return (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? T.accent : T.muted,
                  fontFamily: "var(--font-geist-mono), monospace",
                  borderLeft: `1px solid ${T.line}`,
                }}
              >
                D{day}
              </div>
            );
          })}
        </div>

        {/* 任务行 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {sorted.map((item, index) => {
            const bloom = BLOOM_CONFIG[(item.bloomLevel || 1) as keyof typeof BLOOM_CONFIG] || BLOOM_CONFIG[1];
            const startCol = Math.max(item.startDay, 1);
            const duration = Math.max(item.durationDays, 1);

            return (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: `240px repeat(${daysArray.length}, minmax(36px, 1fr))`,
                  borderBottom: `1px solid ${T.line}`,
                  alignItems: "center",
                  minHeight: 46,
                  transition: "background 0.1s",
                  background: index % 2 === 0 ? "transparent" : `${T.soft}33`,
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
                      background: item.completed ? bloom.color : "transparent",
                      color: "#fff",
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

                {/* 右侧甘特图条柱区域 */}
                <div
                  style={{
                    gridColumn: `2 / span ${daysArray.length}`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${daysArray.length}, minmax(36px, 1fr))`,
                    height: "100%",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {/* 今日基准指示线 (Today vertical line) */}
                  <div
                    style={{
                      position: "absolute",
                      left: 18,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      background: T.accent,
                      opacity: 0.3,
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />

                  {/* 任务进度柱条 */}
                  <motion.div
                    onClick={() => onSelectSubtask(item)}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      gridColumn: `${startCol} / span ${duration}`,
                      background: item.completed ? `${bloom.color}50` : bloom.color,
                      borderRadius: 6,
                      height: 26,
                      margin: "0 4px",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: `0 2px 6px ${bloom.color}30`,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      zIndex: 1,
                    }}
                    title={`${item.title} (第${startCol}天起，共${duration}天)`}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </span>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        {subtasks.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: T.muted, fontSize: 13 }}>
            暂无时间轴数据
          </div>
        )}
      </div>
    </div>
  );
}
