"use client";

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { useTranslation } from "react-i18next";

import { T } from "@/lib/design-tokens";

// Priority label helpers
const URGENCY_COLORS = ["", "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e"];

interface Props {
  row: SubtaskWithTask;
  isSelected: boolean;
  isHighlighted: boolean;
  onOpen: () => void;                                        // 单击打开详情
  onSelect: () => void;                                      // 选中（聚焦右侧面板）
  onDeleteTask: (taskId: string, e: React.MouseEvent) => void;
  onToggle: (e: React.MouseEvent) => void;
}

export function SubtaskRow({ row, isSelected, isHighlighted, onOpen, onSelect, onDeleteTask, onToggle }: Props) {
  const { t } = useTranslation();
  const URGENCY_LABELS = t("subtaskRow.urgency", { returnObjects: true }) as string[];
  const IMPORTANCE_LABELS = t("subtaskRow.importance", { returnObjects: true }) as string[];
  const dateRange = getSubtaskDateRange(row);

  // Parse keywords
  let kwArr: string[] = [];
  if (row.keywords) {
    try { kwArr = JSON.parse(row.keywords) as string[]; } catch { /* ignore */ }
  }

  return (
    <div
      onClick={() => { onOpen(); onSelect(); }}
      style={{
        padding: "10px 14px 10px 18px",
        cursor: "pointer",
        borderBottom: `1px solid ${T.line}`,
        background: isHighlighted
          ? T.highlight
          : row.completed
            ? "var(--color-soft)"
            : isSelected
              ? "rgba(47,93,80,0.06)"
              : T.surface,
        borderLeft: isHighlighted
          ? `3px solid ${T.orange}`
          : isSelected
            ? `3px solid ${T.accent}`
            : `3px solid transparent`,
        transition: "background 0.2s, border-left 0.2s",
        opacity: row.completed ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        {/* Status dot */}
        <div style={{
          width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 5,
          background: row.completed ? T.green : T.accent,
          boxShadow: row.completed
            ? `0 0 0 3px rgba(47,93,80,0.14)`
            : `0 0 0 3px rgba(47,93,80,0.12)`,
        }} />

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title */}
          <div style={{
            color: row.completed ? T.muted : T.ink, fontSize: 14, fontWeight: 500,
            letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: row.completed ? "line-through" : "none",
          }}>
            {row.title}
          </div>

          {/* Meta row: task + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span style={{
              color: row.taskStatus === "done" ? T.green : T.accent,
              fontSize: 11, fontWeight: 500,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {row.taskTitle}
            </span>
            <span style={{ color: T.line, flexShrink: 0 }}>·</span>
            <span style={{ color: T.muted, fontSize: 11, fontFamily: "var(--font-geist-mono), monospace", flexShrink: 0 }}>
              {dateRange ?? t("subtaskRow.days", { count: row.durationDays })}
            </span>
          </div>

          {/* Attribute badges: topic, urgency, importance, keywords */}
          {(row.topic || row.urgency || row.importance || kwArr.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
              {row.topic && (
                <AttrBadge label={row.topic} color={T.accent} bg="rgba(59,122,255,0.07)" />
              )}
              {row.urgency && row.urgency >= 1 && row.urgency <= 5 && (
                <AttrBadge
                  label={`⚡${URGENCY_LABELS[row.urgency]}`}
                  color={URGENCY_COLORS[row.urgency]}
                  bg={`${URGENCY_COLORS[row.urgency]}15`}
                />
              )}
              {row.importance && row.importance >= 1 && row.importance <= 5 && (
                <AttrBadge
                  label={`★${IMPORTANCE_LABELS[row.importance]}`}
                  color="#7C4DFF"
                  bg="rgba(124,77,255,0.07)"
                />
              )}
              {kwArr.slice(0, 2).map((kw, i) => (
                <AttrBadge key={i} label={kw} color={T.orange} bg="rgba(224,123,42,0.08)" />
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: 1 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(e); }}
            title={row.completed ? t("subtaskRow.markUndone") : t("subtaskRow.markDone")}
            style={{
              width: 26, height: 26, borderRadius: 6,
              border: `1px solid ${row.completed ? T.green : T.line}`,
              background: row.completed ? "rgba(47,93,80,0.08)" : "transparent",
              color: row.completed ? T.green : T.muted,
              fontSize: 12, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✓</button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteTask(row.taskId, e); }}
            title={t("subtaskRow.deleteTask")}
            style={{
              width: 26, height: 26, borderRadius: 6, border: "none",
              background: "transparent", color: T.muted, fontSize: 16,
              cursor: "pointer", opacity: 0.4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>
      </div>
    </div>
  );
}

function AttrBadge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 9, padding: "2px 6px", borderRadius: 4,
      color, background: bg,
      border: `1px solid ${color}25`,
      whiteSpace: "nowrap", maxWidth: 80,
      overflow: "hidden", textOverflow: "ellipsis",
      fontWeight: 500, letterSpacing: "0.01em",
    }}>
      {label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function getSubtaskDateRange(row: SubtaskWithTask): string | null {
  if (!row.taskStartDate) return null;
  const base = new Date(row.taskStartDate);
  if (isNaN(base.getTime())) return null;
  const start = new Date(base);
  start.setDate(base.getDate() + row.startDay);
  const end = new Date(base);
  end.setDate(base.getDate() + row.startDay + row.durationDays - 1);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return start.getTime() === end.getTime() ? fmt(start) : `${fmt(start)} - ${fmt(end)}`;
}

export function getSubtaskActualDates(row: SubtaskWithTask): { start: Date; end: Date } | null {
  if (!row.taskStartDate) return null;
  const base = new Date(row.taskStartDate);
  if (isNaN(base.getTime())) return null;
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const start = new Date(baseDay);
  start.setDate(baseDay.getDate() + row.startDay);
  const end = new Date(baseDay);
  end.setDate(baseDay.getDate() + row.startDay + row.durationDays - 1);
  return { start, end };
}
