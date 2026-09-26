"use client";

import React from "react";
import { T, BLOOM_CONFIG } from "@/lib/design-tokens";
import { addDays, diffDays } from "@/lib/dates";
import { fmtShortDate } from "@/components/task/task-dates";
import { TimelineGanttRow } from "./timeline-gantt-row";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface TimelineViewProps {
  subtasks: SubtaskWithTask[];
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
}

function todayUtc0(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function TimelineView({
  subtasks,
  onSelectSubtask,
  onToggleSubtask,
}: TimelineViewProps) {
  // 跨任务排序/布局只消费数据层派生的 absoluteStart/End（相对 startDay 不做跨任务比较）。
  const today0 = todayUtc0();
  const dated = subtasks
    .filter((s) => !!s.absoluteStart)
    .sort((a, b) => {
      const diff = new Date(a.absoluteStart!).getTime() - new Date(b.absoluteStart!).getTime();
      return diff !== 0 ? diff : a.startDay - b.startDay;
    });
  const undated = subtasks.filter((s) => !s.absoluteStart);
  const rows = [...dated, ...undated];

  const windowStart = dated.length ? addDays(new Date(dated[0].absoluteStart!), 0) : today0;
  const maxEnd = dated.reduce(
    (acc, s) => Math.max(acc, s.absoluteEnd ? new Date(s.absoluteEnd).getTime() : 0),
    windowStart.getTime()
  );
  const dayCount = Math.min(Math.max(diffDays(windowStart, new Date(maxEnd)) + 1, 14), 30);
  const todayIdx = diffDays(windowStart, today0);
  const daysArray = Array.from({ length: dayCount }, (_, i) => addDays(windowStart, i));

  return (
    <div
      className="pb-[calc(84px+env(safe-area-inset-bottom,0px))] sm:pb-8 px-3.5 sm:px-5 pt-4"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
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
            时间甘特图 (Timeline)
          </div>
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 3 }}>
            色条颜色对应子任务的认知层级（L1 识记 → L6 创造）
          </div>
        </div>

        {/* 图例：与 timeline-gantt-row 的实际渲染一致——条色 = Bloom 层级阶梯 */}
        <div className="flex flex-wrap items-center gap-3">
          {[1, 2, 3, 4, 5, 6].map((lv) => (
            <span key={lv} className="flex items-center gap-1.5 text-caption text-text-3">
              <span
                aria-hidden
                className="size-2.5 rounded-chip-sm"
                style={{ background: BLOOM_CONFIG[lv].color }}
              />
              <span className="font-mono font-medium">L{lv}</span>
              <span>{BLOOM_CONFIG[lv].name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 甘特图容器 */}
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          overflowX: "auto",
          boxShadow: "0 1px 4px var(--cream)",
        }}
      >
        {/* 时间刻度表头：D1 = 窗口首日（全部排期中最早的开始日） */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `240px repeat(${dayCount}, minmax(36px, 1fr))`,
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
              fontFamily: "var(--mono)",
            }}
          >
            任务 / 计划
          </div>
          {daysArray.map((date, i) => {
            const isToday = i === todayIdx;
            return (
              <div
                key={i}
                title={fmtShortDate(date)}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 500,
                  // 与 §屏二 甘特表头同一语言：今日 = 点缀黄底 + 墨字
                  color: isToday ? "var(--ink)" : T.muted,
                  background: isToday ? "var(--accent)" : "transparent",
                  borderRadius: 6,
                  fontFamily: "var(--mono)",
                  borderLeft: `1px solid ${T.line}`,
                }}
              >
                D{i + 1}
              </div>
            );
          })}
        </div>

        {/* 任务行 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {rows.map((item, index) => {
            const startIdx = item.absoluteStart
              ? Math.min(Math.max(diffDays(windowStart, new Date(item.absoluteStart)), 0), dayCount - 1)
              : null;
            const rawDuration = Math.max(item.durationDays, 1);
            const duration = startIdx === null ? rawDuration : Math.min(rawDuration, dayCount - startIdx);
            return (
              <TimelineGanttRow
                key={item.id}
                item={item}
                dayCount={dayCount}
                todayIdx={todayIdx}
                startIdx={startIdx}
                duration={duration}
                zebra={index % 2 !== 0}
                onSelectSubtask={onSelectSubtask}
                onToggleSubtask={onToggleSubtask}
              />
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
