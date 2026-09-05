"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { T } from "@/lib/design-tokens";
import { BloomStaircase } from "./bloom-staircase";
export { getSubtaskDateRange, getSubtaskActualDates } from "./subtask-row";
export { T };

// ─── Bloom Level Colors & Badges ─────────────────────────────────────
export const BLOOM_COLORS: Record<number, string> = {
  1: "var(--bloom-1, #94A3B8)",
  2: "var(--bloom-2, #60A5FA)",
  3: "var(--bloom-3, #34D399)",
  4: "var(--bloom-4, #FBBF24)",
  5: "var(--bloom-5, #F97316)",
  6: "var(--bloom-6, #EC4899)",
};

const TOPIC_COLORS: Record<string, string> = {
  "编程": "var(--accent, #4F46E5)",
  "数学": "var(--bloom-2, #60A5FA)",
  "语言": "var(--bloom-4, #FBBF24)",
  "科学": "var(--bloom-3, #34D399)",
  "艺术": "var(--bloom-6, #EC4899)",
  "商业": "var(--bloom-5, #F97316)",
  "历史": "#8B5CF6",
  "健身": "#10B981",
  "其他": "var(--muted-foreground, #71717A)",
};

const PALETTE = [
  "var(--accent, #4F46E5)",
  "var(--bloom-2, #60A5FA)",
  "var(--bloom-3, #34D399)",
  "var(--bloom-4, #FBBF24)",
  "var(--bloom-5, #F97316)",
  "var(--bloom-6, #EC4899)",
];

export function getTaskColor(taskId: string, topic?: string | null): string {
  if (topic && TOPIC_COLORS[topic]) return TOPIC_COLORS[topic];
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

// ─── 时间段标题组件 (Refined Timeline Section Header) ─────────────────
interface SectionHeaderProps {
  label: string;
  sublabel: string;
  accentColor: string;
  pendingCount: number;
}

export function TimelineSectionHeader({ label, sublabel, accentColor, pendingCount }: SectionHeaderProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
        marginTop: 14,
        padding: "0 2px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 3.5,
            height: 18,
            borderRadius: 2,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}40`,
          }}
        />
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-outfit), Outfit, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--foreground)",
              letterSpacing: "-0.02em",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {sublabel}
          </span>
        </div>
      </div>

      {pendingCount > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--accent)",
            background: "var(--accent-soft)",
            border: "1px solid var(--border)",
            borderRadius: 99,
            padding: "2px 8px",
            fontFamily: "var(--font-jetbrains), monospace",
          }}
        >
          {t("timelineCard.pendingCount", { count: pendingCount })}
        </span>
      )}
    </div>
  );
}

// ─── 单张任务卡片 (Warm Precision Task Card) ──────────────────────────
interface CardProps {
  row: SubtaskWithTask;
  isSelected: boolean;
  isHighlighted: boolean;
  isActive?: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
  onSkip: (e: React.MouseEvent) => void;
  onPostpone: (e: React.MouseEvent) => void;
}

export function TimelineCard({
  row,
  isSelected,
  isHighlighted,
  isActive = false,
  onOpen,
  onSelect,
  onToggle,
  onSkip,
  onPostpone,
}: CardProps) {
  const { t } = useTranslation();
  const BLOOM_LABELS = t("timelineCard.bloom", { returnObjects: true }) as Record<number, string>;
  const taskColor = getTaskColor(row.taskId, row.topic);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const prevCompleted = useRef(row.completed);

  useEffect(() => {
    if (!prevCompleted.current && row.completed) {
      setAnimKey((k) => k + 1);
    }
    prevCompleted.current = row.completed;
  }, [row.completed]);

  const bloomRaw = row.urgency ? Math.max(1, Math.min(6, 7 - row.urgency)) : 3;
  const bloomColor = `var(--bloom-${bloomRaw})`;
  const bloomLabel = BLOOM_LABELS[bloomRaw] ?? `L${bloomRaw}`;

  const deepHours = Math.min(4.5, Math.max(1.0, (row.durationDays || 1) * 1.5));
  const dateRange = getDateLabel(row) ?? (row.taskStartDate ? null : t("timelineCard.days", { count: row.durationDays }));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("timelineCard.viewDetail", {
        title: row.title,
        done: row.completed ? t("timelineCard.completedMark") : "",
      })}
      onClick={() => {
        onOpen();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
          onSelect();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: row.completed
          ? "var(--secondary)"
          : isHighlighted
          ? "var(--accent-soft)"
          : "var(--card)",
        border: "1px solid",
        borderColor: isHighlighted
          ? "var(--accent)"
          : isActive
          ? "var(--accent)"
          : isSelected
          ? "var(--border)"
          : hovered
          ? "var(--accent-soft)"
          : "var(--border)",
        borderLeftWidth: 3.5,
        borderLeftColor: taskColor,
        borderRadius: 12,
        overflow: "hidden",
        opacity: row.completed ? 0.7 : 1,
        boxShadow: isActive
          ? "var(--shadow-md), 0 0 0 2px var(--accent-soft)"
          : hovered
          ? "var(--shadow-md)"
          : "var(--shadow-sm)",
        transform: hovered && !pressed ? "translateY(-1px)" : pressed ? "scale(0.995)" : "none",
        cursor: "pointer",
        transition:
          "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* ── 键盘选中状态条 ── */}
      {isActive && !row.completed && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "var(--accent-soft)",
            borderBottom: "1px solid var(--border)",
            padding: "3px 12px",
            fontSize: 11,
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          <kbd
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "0 4px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
            }}
          >
            Space
          </kbd>
          <span>{t("timelineCard.completeThis")}</span>
          <kbd
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "0 4px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
            }}
          >
            ↑↓
          </kbd>
          <span>{t("timelineCard.toggle")}</span>
        </div>
      )}

      {/* ── 卡片主体 ── */}
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* 完成圆圈按钮 */}
          <button
            key={`circle-${animKey}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(e);
            }}
            aria-label={row.completed ? t("timelineCard.markUndone") : t("timelineCard.markDone")}
            aria-pressed={row.completed}
            className={row.completed && animKey > 0 ? "check-bounce" : ""}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              flexShrink: 0,
              marginTop: 1,
              border: `2px solid ${row.completed ? "var(--accent)" : hovered ? "var(--accent)" : "var(--border)"}`,
              background: row.completed
                ? "var(--accent)"
                : hovered
                ? "var(--accent-soft)"
                : "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.16s ease-out",
            }}
          >
            {row.completed ? (
              <span style={{ color: "var(--accent-foreground)", fontSize: 11, fontWeight: 700 }}>✓</span>
            ) : hovered ? (
              <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 700 }}>✓</span>
            ) : null}
          </button>

          {/* 内容区 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标题 */}
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                color: row.completed ? "var(--muted-foreground)" : "var(--foreground)",
                textDecoration: row.completed ? "line-through" : "none",
                fontFamily: "var(--font-dm-sans), sans-serif",
                letterSpacing: "-0.01em",
                marginBottom: 6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.title}
            </div>

            {/* 徽章行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--foreground)",
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  padding: "1px 8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 140,
                }}
              >
                {row.taskTitle}
              </span>

              {/* Bloom 认知等级胶囊 */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: bloomColor,
                  background: "var(--secondary)",
                  border: `1px solid ${bloomColor}40`,
                  borderRadius: 6,
                  padding: "1px 7px",
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
              >
                L{bloomRaw} · {bloomLabel}
              </span>

              {dateRange && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    fontFamily: "var(--font-jetbrains), monospace",
                  }}
                >
                  {dateRange}
                </span>
              )}
            </div>
          </div>

          {/* 右侧：微型认知阶梯 + 时长 + 次要操作 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Bloom阶梯微缩图 */}
            <div className="hidden sm:block opacity-70 hover:opacity-100 transition-opacity">
              <BloomStaircase levels={[bloomRaw]} completed={[row.completed]} size="sm" />
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--foreground)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                {deepHours}h
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  marginTop: 2,
                  fontFamily: "var(--font-jetbrains), monospace",
                }}
              >
                {t("timelineCard.days", { count: row.durationDays })}
              </div>
            </div>

            {/* 延迟 / 顺延排期快捷操作 */}
            {!row.completed && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  opacity: hovered ? 1 : 0.7,
                  maxWidth: 64,
                  overflow: "hidden",
                  transition: "opacity 0.18s, max-width 0.18s",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPostpone(e);
                  }}
                  aria-label={t("timelineCard.postponeAria")}
                  title={t("timelineCard.postponeTitle") || "顺延 1 天（自动重排接续计划）"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "var(--secondary)",
                    color: "var(--muted-foreground)",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--warning)";
                    e.currentTarget.style.borderColor = "var(--warning)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--muted-foreground)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  ⏭
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip(e);
                  }}
                  aria-label={t("timelineCard.skipAria")}
                  title={t("timelineCard.skipTitle")}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    border: "none",
                    background: "var(--secondary)",
                    color: "var(--muted-foreground)",
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--muted-foreground)";
                  }}
                >
                  ⤼
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getDateLabel(row: SubtaskWithTask): string | null {
  if (!row.taskStartDate) return null;
  const base = new Date(row.taskStartDate);
  if (isNaN(base.getTime())) return null;
  const s = new Date(base);
  s.setDate(base.getDate() + row.startDay);
  const e = new Date(base);
  e.setDate(base.getDate() + row.startDay + row.durationDays - 1);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return s.getTime() === e.getTime() ? fmt(s) : `${fmt(s)}–${fmt(e)}`;
}
