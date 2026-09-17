"use client";

import React from "react";
import { motion } from "framer-motion";
import { Crown, Plus } from "lucide-react";
import { T } from "@/lib/design-tokens";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { parseTaskTags } from "@/lib/task-tags";
import { TagBadge } from "@/components/task/tag-badges";

interface AllPlansViewProps {
  tasks: TaskWithSubtasks[];
  onSelectTask: (taskId: string) => void;
  onNewPlan: () => void;
  onDeleteTask?: (task: TaskWithSubtasks) => void;
}

export function AllPlansView({
  tasks,
  onSelectTask,
  onNewPlan,
  onDeleteTask,
}: AllPlansViewProps) {
  return (
    <div
      className="pb-[calc(84px+env(safe-area-inset-bottom,0px))] sm:pb-8 px-3.5 sm:px-5 pt-4"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* 头部摘要 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div className="font-editorial" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>
            我的学习计划库 ({tasks.length})
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            全局接续排期，每个计划皆有独立认知阶梯与推荐资源
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => openMembershipModal("overview")}
            style={{
              background: "var(--card)",
              color: "var(--foreground)",
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              boxShadow: "var(--shadow-xs)",
              transition: "all 0.15s ease",
            }}
          >
            <Crown size={14} style={{ color: "#F59E0B" }} />
            <span>会员与容量</span>
          </button>

          <button
            onClick={onNewPlan}
            style={{
              background: T.accent,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(74,124,111,0.25)",
              transition: "all 0.15s ease",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "scale(0.97)";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <Plus size={14} /> 新增学习目标
          </button>
        </div>
      </div>

      {/* 计划卡片网格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {tasks.map((task) => {
          const subtasks = task.subtasks || [];
          const total = subtasks.length;
          const completed = subtasks.filter((s) => s.completed).length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
          const isDone = total > 0 && completed === total;

          // Compute total deep work hours
          const totalHours = subtasks.reduce(
            (sum, s) => sum + (s.deepWorkHours ? Number(s.deepWorkHours) || 0 : 0),
            0
          );

          return (
            <motion.div
              key={task.id}
              whileHover={{ y: -2 }}
              onClick={() => onSelectTask(task.id)}
              style={{
                background: T.surface,
                border: `1px solid ${T.line}`,
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {/* 头部：标题与状态胶囊 */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.ink,
                      lineHeight: 1.3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {task.title}
                  </div>
                  {task.rawInput && task.rawInput !== task.title && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: T.muted,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      💡 {task.rawInput}
                    </div>
                  )}
                  {(() => {
                    const taskTags = parseTaskTags(task.tags);
                    if (taskTags.length === 0) return null;
                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                        {taskTags.map((tag) => (
                          <TagBadge key={tag} tag={tag} size="sm" />
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* 状态胶囊 (Status Pill) */}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 999,
                    background: isDone
                      ? "rgba(45,139,86,0.12)"
                      : completed > 0
                      ? "rgba(74,124,111,0.12)"
                      : T.soft,
                    color: isDone ? "#2D8B56" : completed > 0 ? T.accent : T.muted,
                    border: `1px solid ${
                      isDone
                        ? "rgba(45,139,86,0.25)"
                        : completed > 0
                        ? "rgba(74,124,111,0.25)"
                        : T.line
                    }`,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? "已完结" : completed > 0 ? "进行中" : "已规划"}
                </span>
              </div>

              {/* 进度环与关键统计 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Apple Watch 风格微型圆环 */}
                  <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                    <svg width="44" height="44" viewBox="0 0 44 44">
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={T.soft}
                        strokeWidth="3.5"
                      />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={isDone ? "#2D8B56" : T.accent}
                        strokeWidth="3.5"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - (total > 0 ? completed / total : 0))}`}
                        strokeLinecap="round"
                        transform="rotate(-90 22 22)"
                      />
                    </svg>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.ink,
                        fontFamily: "var(--font-geist-mono), monospace",
                      }}
                    >
                      {pct}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: "var(--font-geist-mono), monospace" }}>
                      {completed} / {total} <span style={{ fontSize: 11, fontWeight: 400, color: T.muted }}>个子任务</span>
                    </div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      预计 {task.totalDays || 7} 天排期
                    </div>
                  </div>
                </div>

                {totalHours > 0 && (
                  <div
                    style={{
                      textAlign: "right",
                      background: T.soft,
                      borderRadius: 8,
                      padding: "4px 8px",
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: "var(--font-geist-mono), monospace" }}>
                      {totalHours.toFixed(1)}h
                    </div>
                    <div style={{ fontSize: 9.5, color: T.muted }}>深度专注</div>
                  </div>
                )}
              </div>

              {/* 底部：操作按钮 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 10,
                  borderTop: `1px solid ${T.line}`,
                  fontSize: 12,
                }}
              >
                <span style={{ color: T.muted }}>
                  {task.startDate
                    ? `始于 ${String(task.startDate).slice(5, 10)}`
                    : "今日启动"}
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {onDeleteTask && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: T.muted,
                        cursor: "pointer",
                        fontSize: 13,
                        padding: "4px 6px",
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#EF4444";
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = T.muted;
                        e.currentTarget.style.background = "transparent";
                      }}
                      title="删除此计划"
                      aria-label={`删除计划 ${task.title}`}
                    >
                      ✕
                    </button>
                  )}
                  <span style={{ color: T.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
                    进入详情 →
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {tasks.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "48px 20px",
              textAlign: "center",
              background: T.surface,
              border: `1px dashed ${T.line}`,
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 32 }}>📚</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>暂无学习计划</div>
            <div style={{ fontSize: 13, color: T.muted, maxWidth: 320 }}>
              输入你感兴趣的学习主题或技能，AI 将为你规划科学的认知阶梯与权威资源
            </div>
            <button
              onClick={onNewPlan}
              style={{
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              立即创建第一个计划
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
