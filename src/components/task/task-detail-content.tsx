"use client";
/**
 * task-detail-content.tsx
 * 任务详情页核心 UI — 三区布局：
 *   ① Hero 区    大任务标题 + 原始输入 + 整体进度环
 *   ② Bloom 轴   当前认知阶段高亮，节点连线动态填色
 *   ③ 子任务列表  每行：序号 + 完成圆圈 + 标题描述 + 资源徽章 + 工期
 *   ④ 资源汇总   所有子任务资源去重后集中展示，trust_level 颜色区分
 *   ⑤ Gantt 图  可折叠，保留原有组件
 */

import type { Subtask } from "@/lib/db/schema";
import { useTranslation } from "react-i18next";
import { getResolvedLocale } from "@/i18n";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { GanttChart } from "@/components/task/gantt-chart";
import { openExternalUrl } from "@/lib/safe-url";
import {
  URL_STATUS_CONFIG,
  FRESHNESS_CONFIG,
  AUTHORITY_LABEL_CONFIG,
} from "@/lib/resource-validator";

// ─── Design tokens ──────────────────────────────────────────────────────
const T = {
  bg:      "#F9F9F8",
  surface: "#FFFFFF",
  soft:    "#F1F2EE",
  line:    "#E7E7E2",
  ink:     "#111111",
  muted:   "#777B75",
  accent:  "#3B7AFF",
  green:   "#2F5D50",
  orange:  "#E07B2A",
  purple:  "#7C4DFF",
} as const;

// ─── Bloom 配置 ──────────────────────────────────────────────────────────
const BLOOM = [
  { level: 1, icon: "📖", color: "#94a3b8" },
  { level: 2, icon: "💡", color: "#60a5fa" },
  { level: 3, icon: "🔧", color: "#34d399" },
  { level: 4, icon: "🔍", color: "#f97316" },
  { level: 5, icon: "⚖️", color: "#a78bfa" },
  { level: 6, icon: "✨", color: "#f43f5e" },
] as const;

// ─── Resource type ───────────────────────────────────────────────────────
interface Resource {
  type: string;
  title: string;
  url?: string;
  searchQuery?: string;
  platform?: string;
  snippet?: string;
  trust_level?: "verified" | "search_only";
  // 三维可信度字段
  url_status?: string;
  http_status?: number;
  resolved_url?: string;
  authority_score?: number;
  authority_label?: string;
  freshness?: string;
  last_modified?: string;
}

// ─── 进度环 SVG ──────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 72, color = T.accent }: {
  pct: number; size?: number; color?: string;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.line} strokeWidth={6} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={pct >= 1 ? T.green : color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Bloom 进度轴 ────────────────────────────────────────────────────────
function BloomAxis({ subtasks }: { subtasks: Subtask[] }) {
  const { t } = useTranslation();
  // 优先读真实 bloomLevel 字段，旧数据降级用 urgency 反推
  const getBloom = (s: Subtask): number => {
    if (s.bloomLevel && s.bloomLevel >= 1 && s.bloomLevel <= 6) return s.bloomLevel;
    return s.urgency ? Math.max(1, Math.min(5, 6 - s.urgency)) : 2;
  };

  const bloomLevels = subtasks.map(getBloom);
  const maxBloom = bloomLevels.length > 0 ? Math.max(...bloomLevels) : 3;
  const stages = BLOOM.slice(0, maxBloom);

  // 当前激活阶段：未完成子任务中最低 bloom
  const remaining = subtasks.filter(s => !s.completed).map(getBloom);
  const currentBloom = remaining.length > 0 ? Math.min(...remaining) : maxBloom;
  const allDone = subtasks.length > 0 && subtasks.every(s => s.completed);

  if (stages.length < 2) return null;

  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.line}`,
      borderRadius: 14, padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.04em", marginBottom: 14 }}>
        {t("taskDetail.bloom.title")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {stages.map((stage, idx) => {
          const isPast = stage.level < currentBloom || allDone;
          const isActive = !allDone && stage.level === currentBloom;
          const isLast = idx === stages.length - 1;
          return (
            <div key={stage.level} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
              {/* 左连线 */}
              {idx > 0 && (
                <div style={{
                  position: "absolute", left: 0, top: isActive ? 11 : 8,
                  width: "50%", height: 2,
                  background: isPast ? stage.color : T.line,
                  zIndex: 0,
                }} />
              )}
              {/* 右连线 */}
              {!isLast && (
                <div style={{
                  position: "absolute", right: 0, top: isActive ? 11 : 8,
                  width: "50%", height: 2,
                  background: isPast && !isActive ? (BLOOM[idx + 1]?.color ?? T.line) : T.line,
                  zIndex: 0,
                }} />
              )}
              {/* 节点 */}
              <div style={{
                width: isActive ? 24 : 18, height: isActive ? 24 : 18,
                borderRadius: "50%", position: "relative", zIndex: 1,
                background: isPast ? stage.color : isActive ? stage.color : T.soft,
                border: `2px solid ${isPast || isActive ? stage.color : T.line}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isActive ? `0 0 0 5px ${stage.color}22` : "none",
                transition: "box-shadow 0.3s ease-out, background-color 0.3s ease-out",
              }}>
                {isPast && !isActive && (
                  <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>✓</span>
                )}
                {isActive && (
                  <span style={{ fontSize: 10 }}>{stage.icon}</span>
                )}
              </div>
              <span style={{
                fontSize: 9, marginTop: 5, fontWeight: isActive ? 700 : 400,
                color: isActive ? stage.color : isPast ? T.muted : T.line,
                whiteSpace: "nowrap",
              }}>
                {t(`taskDetail.bloom.labels.${stage.level}`)}
              </span>
            </div>
          );
        })}
      </div>
      {/* 当前阶段说明 */}
      <div style={{ marginTop: 10, fontSize: 11, color: allDone ? T.green : (BLOOM.find(b => b.level === currentBloom)?.color ?? T.muted) }}>
        {allDone
          ? t("taskDetail.bloom.allDone")
          : t("taskDetail.bloom.current", { icon: BLOOM.find(b => b.level === currentBloom)?.icon, level: currentBloom, label: t(`taskDetail.bloom.labels.${currentBloom}`) })}
      </div>
    </div>
  );
}

// ─── 子任务行 ─────────────────────────────────────────────────────────────
function SubtaskItem({
  subtask, index, onToggle,
}: {
  subtask: Subtask;
  index: number;
  onToggle: (id: string, current: boolean) => void;
}) {
  const { t } = useTranslation();
  // 解析资源
  let resources: Resource[] = [];
  if (subtask.resources) {
    try { resources = JSON.parse(subtask.resources) as Resource[]; } catch { /* ignore */ }
  }
  // 解析关键词
  let keywords: string[] = [];
  if (subtask.keywords) {
    try { keywords = JSON.parse(subtask.keywords) as string[]; } catch { /* ignore */ }
  }

  const bloomRaw = subtask.urgency ? Math.max(1, Math.min(5, 6 - subtask.urgency)) : 2;
  const bloomStage = BLOOM[bloomRaw - 1];

  // 计算日期标签
  const dateLabel = (() => {
    const s = subtask.startDay;
    const e = subtask.startDay + subtask.durationDays - 1;
    return s === e ? t("taskDetail.dayRange.single", { start: s + 1 }) : t("taskDetail.dayRange.range", { start: s + 1, end: e + 1 });
  })();

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "13px 16px",
      borderBottom: `1px solid ${T.line}`,
      background: subtask.completed ? "#FAFAF9" : T.surface,
      opacity: subtask.completed ? 0.65 : 1,
      transition: "opacity 0.2s ease-out, background-color 0.2s ease-out",
    }}>
      {/* 序号 */}
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.muted,
        width: 20, textAlign: "center", flexShrink: 0, marginTop: 3,
        fontFamily: "var(--font-geist-mono), monospace",
      }}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* 完成按钮 */}
      <button
        onClick={() => onToggle(subtask.id, subtask.completed)}
        style={{
          width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1,
          border: `2px solid ${subtask.completed ? T.green : T.line}`,
          background: subtask.completed ? T.green : "transparent",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background-color 0.2s ease-out, border-color 0.2s ease-out",
        }}
      >
        {subtask.completed && (
          <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>
        )}
      </button>

      {/* 内容 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 标题 */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: subtask.completed ? T.muted : T.ink,
          textDecoration: subtask.completed ? "line-through" : "none",
          letterSpacing: "-0.02em", marginBottom: subtask.description ? 3 : 5,
        }}>
          {subtask.title}
        </div>
        {/* 描述 */}
        {subtask.description && (
          <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, marginBottom: 6 }}>
            {subtask.description}
          </div>
        )}
        {/* 徽章行 */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {/* Bloom 徽章 */}
          <span style={{
            fontSize: 9, fontWeight: 700,
            color: bloomStage.color, background: `${bloomStage.color}15`,
            border: `1px solid ${bloomStage.color}30`,
            borderRadius: 4, padding: "2px 7px",
          }}>
            {bloomStage.icon} {t(`taskDetail.bloom.labels.${bloomStage.level}`)}
          </span>
          {/* 关键词 */}
          {keywords.slice(0, 2).map((kw, i) => (
            <span key={i} style={{
              fontSize: 9, color: T.orange,
              background: "rgba(224,123,42,0.08)",
              border: "1px solid rgba(224,123,42,0.2)",
              borderRadius: 4, padding: "2px 6px",
            }}>{kw}</span>
          ))}
          {/* 资源数量 */}
          {resources.length > 0 && (
            <span style={{
              fontSize: 9, color: T.accent,
              background: "rgba(59,122,255,0.08)",
              border: "1px solid rgba(59,122,255,0.2)",
              borderRadius: 4, padding: "2px 6px",
            }}>
              📚 {t("taskDetail.resourceCount", { count: resources.length })}
            </span>
          )}
        </div>
      </div>

      {/* 工期 + 日期 */}
      <div style={{ flexShrink: 0, textAlign: "right", minWidth: 48 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.green, letterSpacing: "-0.02em" }}>
          {t("taskDetail.days", { count: subtask.durationDays })}
        </div>
        <div style={{ fontSize: 9, color: T.muted, marginTop: 2, fontFamily: "var(--font-geist-mono), monospace" }}>
          {dateLabel}
        </div>
      </div>
    </div>
  );
}

// ─── 资源汇总区 ──────────────────────────────────────────────────────────
function ResourcePanel({ subtasks }: { subtasks: Subtask[] }) {
  const { t } = useTranslation();
  // 收集所有子任务的资源，去重
  const seen = new Set<string>();
  const allResources: Resource[] = [];
  for (const s of subtasks) {
    if (!s.resources) continue;
    try {
      const rs = JSON.parse(s.resources) as Resource[];
      for (const r of rs) {
        const key = r.url ?? r.searchQuery ?? r.title;
        if (!seen.has(key)) { seen.add(key); allResources.push(r); }
      }
    } catch { /* ignore */ }
  }
  if (allResources.length === 0) return null;

  const verified = allResources.filter(r => r.trust_level === "verified");
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
      {/* 标题 */}
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${T.line}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>
          {t("taskDetail.resourcesTitle")}
        </span>
        <span style={{ fontSize: 10, color: T.muted }}>{t("taskDetail.resourceTotal", { count: allResources.length })}</span>
        {verified.length > 0 && (
          <span style={{
            fontSize: 9, fontWeight: 700, color: T.green,
            background: "rgba(47,93,80,0.1)", border: "1px solid rgba(47,93,80,0.2)",
            borderRadius: 4, padding: "1px 6px",
          }}>{t("taskDetail.verifiedCount", { count: verified.length })}</span>
        )}
      </div>

      {/* 资源列表 */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {allResources.map((r, i) => {
          const tl = r.trust_level ?? (r.url ? "verified" : "search_only");
          const isVerified = tl === "verified";
          const accentColor = isVerified ? T.green : T.orange;
          const clickable = !!(r.url || r.searchQuery);
          const typeIcon = r.type === "course" ? "📚" : r.type === "search" ? "🔎" : r.type === "person" ? "👤" : "🔗";

          // 三维信号
          const urlStatusKey = (r.url_status ?? "unchecked") as keyof typeof URL_STATUS_CONFIG;
          const statusCfg = URL_STATUS_CONFIG[urlStatusKey] ?? URL_STATUS_CONFIG.unchecked;
          const freshKey = (r.freshness ?? "unknown") as keyof typeof FRESHNESS_CONFIG;
          const freshCfg = FRESHNESS_CONFIG[freshKey];
          const authLabelKey = (r.authority_label ?? "unknown") as keyof typeof AUTHORITY_LABEL_CONFIG;
          const authCfg = AUTHORITY_LABEL_CONFIG[authLabelKey];
          const hasValidation = r.url_status !== undefined;
          const isDead = r.url_status === "not_found" || r.url_status === "dead";

          return (
            <div
              key={i}
              onClick={(clickable && !isDead) ? () => {
                const target = r.resolved_url ?? r.url;
                if (target) openExternalUrl(target);
                else if (r.searchQuery) window.open(`https://www.google.com/search?q=${encodeURIComponent(r.searchQuery)}`, "_blank", "noopener,noreferrer");
              } : undefined}
              style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "10px 16px",
                borderBottom: i < allResources.length - 1 ? `1px solid ${T.line}` : "none",
                cursor: (clickable && !isDead) ? "pointer" : "default",
                background: isDead ? "rgba(192,57,43,0.03)" : isVerified ? "rgba(47,93,80,0.02)" : "transparent",
                opacity: isDead ? 0.65 : 1,
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{typeIcon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* 标题 + trust 徽章 */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: hasValidation ? 4 : 2 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 500, color: isDead ? T.muted : T.ink,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                  }}>
                    {r.title}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, flexShrink: 0,
                    color: accentColor, background: `${accentColor}14`,
                    border: `1px solid ${accentColor}28`,
                    borderRadius: 4, padding: "1px 5px",
                  }}>
                    {isVerified ? t("taskDetail.trustVerified") : t("taskDetail.trustSearch")}
                  </span>
                </div>

                {/* 三维信号徽章行 */}
                {hasValidation && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600, color: statusCfg.color,
                      background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                      borderRadius: 4, padding: "1px 5px",
                    }}>
                      {statusCfg.icon} {statusCfg.label}
                    </span>
                    {r.authority_score !== undefined && (
                      <span style={{
                        fontSize: 9, fontWeight: 600,
                        color: r.authority_score >= 8 ? "#2F5D50" : r.authority_score >= 5 ? "#8B6A2E" : "#777B75",
                        background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 4, padding: "1px 5px",
                      }}>
                        {authCfg.icon} {authCfg.label} {r.authority_score}/10
                      </span>
                    )}
                    {r.freshness && r.freshness !== "unknown" && (
                      <span style={{
                        fontSize: 9, fontWeight: 600, color: freshCfg.color,
                        background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)",
                        borderRadius: 4, padding: "1px 5px",
                      }}>
                        {freshCfg.icon} {freshCfg.label}
                      </span>
                    )}
                  </div>
                )}

                {r.platform && <div style={{ fontSize: 10, color: T.muted, marginBottom: 1 }}>{r.platform}</div>}
                {r.snippet && (
                  <div style={{
                    fontSize: 10, color: T.muted, marginTop: 2, lineHeight: 1.45,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {r.snippet}
                  </div>
                )}
                {!isDead && (r.resolved_url ?? r.url) && (
                  <div style={{ fontSize: 10, color: accentColor, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.resolved_url ?? r.url}
                  </div>
                )}
                {isDead && (
                  <div style={{ fontSize: 10, color: "#C0392B", marginTop: 2 }}>{t("taskDetail.deadLink")}</div>
                )}
                {!r.url && r.searchQuery && (
                  <div style={{ fontSize: 10, color: accentColor, marginTop: 2, fontFamily: "var(--font-geist-mono), monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t("taskDetail.search", { query: r.searchQuery })}
                  </div>
                )}
              </div>
              {(clickable && !isDead) && <span style={{ color: accentColor, fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>}
              {isDead && <span style={{ color: "#C0392B", fontSize: 12, flexShrink: 0, marginTop: 2 }}>✕</span>}
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div style={{ padding: "8px 16px 10px", display: "flex", gap: 14, background: T.soft }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: T.muted }}>{t("taskDetail.legendVerified")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.orange, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: T.muted }}>{t("taskDetail.legendSearch")}</span>
        </div>
      </div>
    </div>
  );
}

// ─── 统计卡片 ─────────────────────────────────────────────────────────────
function StatCard({ value, label, color = T.ink }: { value: string; label: string; color?: string }) {
  return (
    <div style={{
      flex: 1, background: T.surface, border: `1px solid ${T.line}`,
      borderRadius: 12, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: "-0.05em", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: T.muted, marginTop: 5, fontWeight: 500, letterSpacing: "0.04em" }}>
        {label}
      </div>
    </div>
  );
}

// ─── 主组件 ──────────────────────────────────────────────────────────────
interface Props {
  task: TaskWithSubtasks;
  onToggle: (subtaskId: string, current: boolean) => void;
}

export function TaskDetailContent({ task, onToggle }: Props) {
  const { t } = useTranslation();
  const completedCount = task.subtasks.filter(s => s.completed).length;
  const totalCount = task.subtasks.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;
  const progressColor = progressPct >= 1 ? T.green : T.accent;

  // 计算总预计学习时长（durationDays * 1.5h）
  const totalHours = task.subtasks.reduce((sum, s) => sum + s.durationDays * 1.5, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "var(--font-geist), system-ui, sans-serif" }}>

      {/* ① Hero 区 */}
      <div style={{
        background: T.surface, border: `1px solid ${T.line}`,
        borderRadius: 16, padding: "20px 22px",
        display: "flex", alignItems: "flex-start", gap: 16,
      }}>
        {/* 进度环 */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <ProgressRing pct={progressPct} size={72} color={progressColor} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: progressColor, lineHeight: 1 }}>
                {Math.round(progressPct * 100)}
              </span>
              <span style={{ fontSize: 8, color: T.muted, marginTop: 1 }}>%</span>
            </div>
          </div>
          <span style={{ fontSize: 9, color: T.muted, textAlign: "center" }}>
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* 标题区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{
            fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800,
            color: T.ink, letterSpacing: "-0.04em", lineHeight: 1.2,
            margin: 0, marginBottom: 6,
          }}>
            {task.title}
          </h1>
          {task.rawInput && task.rawInput !== task.title && (
            <div style={{
              fontSize: 12, color: T.muted, lineHeight: 1.4,
              marginBottom: 8,
              borderLeft: `2px solid ${T.line}`, paddingLeft: 8,
            }}>
              &ldquo;{task.rawInput}&rdquo;
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <MetaBadge label={t("taskDetail.planDays", { count: task.totalDays })} color={T.accent} />
            <MetaBadge label={t("taskDetail.approxHours", { count: totalHours.toFixed(0) })} color={T.purple} />
            <MetaBadge
              label={task.status === "done" ? t("taskDetail.statusDone") : t("taskDetail.statusDoing")}
              color={task.status === "done" ? T.green : T.orange}
            />
            <MetaBadge
              label={t("taskDetail.created", { date: new Date(task.createdAt).toLocaleDateString(getResolvedLocale(), { month: "short", day: "numeric" }) })}
              color={T.muted}
            />
          </div>
        </div>
      </div>

      {/* ② Bloom 认知进度轴 */}
      {task.subtasks.length > 0 && <BloomAxis subtasks={task.subtasks} />}

      {/* ③ 统计行 */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard value={String(completedCount)} label={t("taskDetail.statCompleted")} color={T.green} />
        <StatCard value={String(totalCount - completedCount)} label={t("taskDetail.statPending")} color={T.accent} />
        <StatCard value={t("taskDetail.days", { count: task.totalDays })} label={t("taskDetail.statPlanDays")} color={T.purple} />
        <StatCard value={`${totalHours.toFixed(0)}h`} label={t("taskDetail.statHours")} color={T.orange} />
      </div>

      {/* ④ 子任务列表 */}
      <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px 10px", borderBottom: `1px solid ${T.line}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{t("taskDetail.stepsTitle")}</span>
          <span style={{ fontSize: 10, color: T.muted }}>{t("taskDetail.subtaskCount", { count: totalCount })}</span>
          <div style={{ flex: 1 }} />
          {/* 整体进度条 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 80, height: 4, background: T.soft, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: 4, width: `${progressPct * 100}%`, background: progressColor, borderRadius: 2, transition: "width 0.4s" }} />
            </div>
            <span style={{ fontSize: 10, color: T.muted, fontFamily: "var(--font-geist-mono), monospace" }}>
              {Math.round(progressPct * 100)}%
            </span>
          </div>
        </div>
        {task.subtasks
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s, i) => (
            <SubtaskItem key={s.id} subtask={s} index={i} onToggle={onToggle} />
          ))}
      </div>

      {/* ⑤ 资源汇总 */}
      <ResourcePanel subtasks={task.subtasks} />

      {/* ⑥ Gantt 图（可折叠） */}
      {task.subtasks.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, overflow: "hidden" }}>
          <GanttChart
            subtasks={task.subtasks}
            totalDays={task.totalDays}
            animated={false}
            collapsible={true}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  );
}

// ─── 小工具 ──────────────────────────────────────────────────────────────
function MetaBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, color,
      background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: 5, padding: "2px 8px",
    }}>{label}</span>
  );
}
