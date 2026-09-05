"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { T, BLOOM_CONFIG } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface AscendingStepsViewProps {
  subtasks: SubtaskWithTask[];
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
}

export function AscendingStepsView({
  subtasks,
  onToggleSubtask,
  onSelectSubtask,
}: AscendingStepsViewProps) {
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<number | "all">("all");

  // Group subtasks by Bloom Taxonomy Level (1 to 6)
  const levelGroups = [1, 2, 3, 4, 5, 6].map((lvl) => {
    const config = BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG];
    const items = subtasks.filter((s) => (s.bloomLevel || 1) === lvl);
    const completedItems = items.filter((s) => s.completed);
    return {
      level: lvl,
      config,
      items,
      completedCount: completedItems.length,
      totalCount: items.length,
      pct: items.length > 0 ? completedItems.length / items.length : 0,
    };
  });

  const totalSubtasks = subtasks.length;
  const completedTotal = subtasks.filter((s) => s.completed).length;
  const overallPct = totalSubtasks > 0 ? Math.round((completedTotal / totalSubtasks) * 100) : 0;

  // Filter items if a specific level is clicked
  const activeLevelData = selectedBloomLevel === "all"
    ? null
    : levelGroups.find((g) => g.level === selectedBloomLevel);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "16px 20px 32px" }}>
      {/* 顶部概览：拾级天梯叙事与总步阶进度 */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 14,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: "rgba(74,124,111,0.12)",
                color: T.accent,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              🪜
            </span>
            <span className="font-editorial" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>
              拾级天梯 · 认知进阶图谱
            </span>
          </div>
          <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, margin: 0 }}>
            源自布鲁姆认知目标分类学（Bloom&apos;s Taxonomy），从基础识记到终极创造，将宏大目标化为步步攀升的可行阶梯。
          </p>
        </div>

        {/* 攀登进度指示器 */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.accent, fontFamily: "var(--font-geist-mono), monospace", lineHeight: 1.1 }}>
              {completedTotal} <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>/ {totalSubtasks} 阶</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
              已完成 {overallPct}% 攀登里程
            </div>
          </div>
          {/* Apple Watch 风格轻量进度环 */}
          <div style={{ position: "relative", width: 52, height: 52 }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke={T.soft}
                strokeWidth="4"
              />
              <circle
                cx="26"
                cy="26"
                r="22"
                fill="none"
                stroke={T.accent}
                strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - (totalSubtasks > 0 ? completedTotal / totalSubtasks : 0))}`}
                strokeLinecap="round"
                transform="rotate(-90 26 26)"
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color: T.ink,
                fontFamily: "var(--font-geist-mono), monospace",
              }}
            >
              {overallPct}%
            </div>
          </div>
        </div>
      </div>

      {/* 认知六级阶梯 (Staircase Stepped Visualization) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="font-editorial" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>
            六级台阶全览 (点击台阶可按层筛选)
          </div>
          {selectedBloomLevel !== "all" && (
            <button
              onClick={() => setSelectedBloomLevel("all")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 12,
                color: T.accent,
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
              }}
            >
              显示全部台阶 ✕
            </button>
          )}
        </div>

        {/* 阶梯可视化横向/纵向排布 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {levelGroups.map((group) => {
            const isSelected = selectedBloomLevel === group.level;
            const isFinished = group.totalCount > 0 && group.completedCount === group.totalCount;

            return (
              <motion.div
                key={group.level}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedBloomLevel(isSelected ? "all" : group.level)}
                style={{
                  background: isSelected ? group.config.bg : T.surface,
                  border: `1.5px solid ${isSelected ? group.config.color : T.line}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected
                    ? `0 4px 12px ${group.config.color}25`
                    : "0 1px 3px rgba(0,0,0,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: `${group.config.color}18`,
                      color: group.config.color,
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    阶 {group.level}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: "var(--font-geist-mono), monospace" }}>
                    {group.completedCount}/{group.totalCount}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>
                    {group.config.name}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted }}>
                    {group.config.nameEn}
                  </div>
                </div>

                {/* 台阶微型进度条 */}
                <div style={{ height: 4, background: T.soft, borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
                  <div
                    style={{
                      width: `${Math.round(group.pct * 100)}%`,
                      height: "100%",
                      background: group.config.color,
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>

                {isFinished && (
                  <div style={{ fontSize: 10, color: "#2D8B56", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                    ✓ 阶梯通关
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 当前阶梯的子任务列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="font-editorial" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
            {selectedBloomLevel === "all"
              ? "全阶任务清单"
              : `阶梯 ${selectedBloomLevel} · ${activeLevelData?.config.name}任务清单 (${activeLevelData?.items.length || 0})`}
          </div>
          <span style={{ fontSize: 12, color: T.muted }}>
            点击复选框标记完成 · 点击卡片查看资源详情
          </span>
        </div>

        {/* 任务卡片 */}
        {subtasks
          .filter((s) => selectedBloomLevel === "all" || (s.bloomLevel || 1) === selectedBloomLevel)
          .map((item) => {
            const bloom = BLOOM_CONFIG[(item.bloomLevel || 1) as keyof typeof BLOOM_CONFIG] || BLOOM_CONFIG[1];
            return (
              <motion.div
                key={item.id}
                layout
                onClick={() => onSelectSubtask(item)}
                style={{
                  background: T.surface,
                  border: `1px solid ${item.completed ? T.line : T.line}`,
                  borderLeft: `4px solid ${bloom.color}`,
                  borderRadius: 10,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  opacity: item.completed ? 0.75 : 1,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
                whileHover={{ y: -1, boxShadow: "0 3px 8px rgba(0,0,0,0.04)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  {/* 复选框 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSubtask(item);
                    }}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 5,
                      border: `1.5px solid ${item.completed ? bloom.color : T.line}`,
                      background: item.completed ? bloom.color : "transparent",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {item.completed ? "✓" : ""}
                  </button>

                  {/* 标题与所属计划 */}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: item.completed ? T.muted : T.ink,
                        textDecoration: item.completed ? "line-through" : "none",
                        lineHeight: 1.4,
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>
                        📌 {item.taskTitle}
                      </span>
                      {item.deepWorkHours && (
                        <span style={{ fontSize: 10.5, color: T.muted, fontFamily: "var(--font-geist-mono), monospace" }}>
                          ⏱ {item.deepWorkHours}h 深度专注
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 右侧：认知层级标签 + 周期 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: `${bloom.color}15`,
                      color: bloom.color,
                      border: `1px solid ${bloom.color}30`,
                    }}
                  >
                    {bloom.name}
                  </span>
                  <span style={{ fontSize: 11.5, color: T.muted, fontFamily: "var(--font-geist-mono), monospace" }}>
                    {item.durationDays} 天
                  </span>
                </div>
              </motion.div>
            );
          })}

        {subtasks.length === 0 && (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              background: T.surface,
              border: `1px dashed ${T.line}`,
              borderRadius: 12,
              color: T.muted,
              fontSize: 13,
            }}
          >
            暂无学习任务阶梯，请先创建一个学习目标
          </div>
        )}
      </div>
    </div>
  );
}
