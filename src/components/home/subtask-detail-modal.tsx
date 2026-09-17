"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { getSubtaskDateRange } from "./subtask-row";
import { openExternalUrl } from "@/lib/safe-url";
import {
  URL_STATUS_CONFIG,
  FRESHNESS_CONFIG,
  AUTHORITY_LABEL_CONFIG,
} from "@/lib/resource-validator";

import { T } from "@/lib/design-tokens";

// trust_level 颜色配置
// verified  = 绿色边框 + 绿色标签：代码通过 Tavily 检索到的真实 URL
// search_only = 黄色边框 + 黄色标签：搜索词，点击跳转搜索引擎
const TRUST_CONFIG = {
  verified: {
    border: "rgba(47,93,80,0.25)",
    bg: "rgba(47,93,80,0.05)",
    badgeBg: "rgba(47,93,80,0.12)",
    badgeColor: "#2F5D50",
    arrowColor: "#2F5D50",
  },
  search_only: {
    border: "rgba(224,123,42,0.3)",
    bg: "rgba(224,123,42,0.04)",
    badgeBg: "rgba(224,123,42,0.12)",
    badgeColor: "#E07B2A",
    arrowColor: "#E07B2A",
  },
} as const;

interface Props {
  row: SubtaskWithTask;
  onClose: () => void;
  onToggle: () => void;
  onOpenTask: () => void;
}

export function SubtaskDetailModal({ row, onClose, onToggle, onOpenTask }: Props) {
  const { t } = useTranslation();
  const dateRange = getSubtaskDateRange(row);

  // 解析资源（兼容旧格式和新 TrustableResource 格式）
  type ResItem = {
    type: string; title: string; url?: string; searchQuery?: string;
    author?: string; platform?: string; snippet?: string;
    trust_level?: "verified" | "search_only";
    // 三维可信度字段
    url_status?: string;
    http_status?: number;
    resolved_url?: string;
    authority_score?: number;
    authority_label?: string;
    freshness?: string;
    last_modified?: string;
  };
  let resources: ResItem[] = [];
  if (row.resources) {
    try { resources = JSON.parse(row.resources) as ResItem[]; } catch { /* ignore */ }
  }

  // 解析关键词
  let keywords: string[] = [];
  if (row.keywords) {
    try { keywords = JSON.parse(row.keywords) as string[]; } catch { /* ignore */ }
  }

  const verifiedCount = resources.filter((r) => r.trust_level === "verified").length;
  const hasVerified = verifiedCount > 0;

  // ── 学习 Prompt：搜索无结果时，供用户复制到外部 AI ──
  const [copied, setCopied] = useState(false);
  const buildLearnPrompt = (): string => {
    const bloomMap = t("subtaskDetail.prompt.bloom", { returnObjects: true }) as Record<number, string>;
    const lines: string[] = [];
    lines.push(t("subtaskDetail.prompt.intro", { task: row.taskTitle, title: row.title }));
    if (row.description) lines.push(t("subtaskDetail.prompt.description", { desc: row.description }));
    if (row.topic) lines.push(t("subtaskDetail.prompt.topic", { topic: row.topic }));
    if (row.bloomLevel && bloomMap[row.bloomLevel]) {
      lines.push(t("subtaskDetail.prompt.bloomLine", { level: bloomMap[row.bloomLevel], n: row.bloomLevel }));
    }
    if (keywords.length) lines.push(t("subtaskDetail.prompt.keywords", { list: keywords.join(t("subtaskDetail.prompt.keywordSep")) }));
    lines.push(t("subtaskDetail.prompt.instruction"));
    return lines.join("\n");
  };

  const handleCopyPrompt = async () => {
    const text = buildLearnPrompt();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级：用临时 textarea
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.22)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        background: T.surface, border: `1px solid ${T.line}`, borderRadius: 18,
        padding: "18px 18px 16px", width: "min(480px, 94vw)", maxHeight: "86vh",
        overflowY: "auto", zIndex: 201, boxShadow: "0 20px 60px rgba(17,17,17,0.12)",
        display: "flex", flexDirection: "column", gap: 13,
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: row.taskStatus === "done" ? T.green : T.accent, flexShrink: 0 }} />
              <span style={{ color: row.taskStatus === "done" ? T.green : T.accent, fontSize: 11, fontWeight: 600 }}>{row.taskTitle}</span>
            </div>
            <div style={{ color: row.completed ? T.muted : T.ink, fontWeight: 700, fontSize: 17, lineHeight: 1.3, letterSpacing: "-0.03em", textDecoration: row.completed ? "line-through" : "none", wordBreak: "break-all" }}>
              {row.title}
            </div>
          </div>
          <button onClick={onClose} style={{ color: T.muted, background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>

        {/* Attributes strip */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {row.topic && <AttrPill icon="🏷" label={t("subtaskDetail.topic", { topic: row.topic })} color={T.accent} />}
          {row.urgency && <AttrPill icon="⚡" label={t("subtaskDetail.urgency", { value: row.urgency })} color="#f97316" />}
          {row.importance && <AttrPill icon="★" label={t("subtaskDetail.importance", { value: row.importance })} color={T.purple} />}
          {keywords.slice(0, 3).map((k, i) => <AttrPill key={i} icon="🔑" label={k} color={T.orange} />)}
          <MetaTag label={t("subtaskDetail.durationLabel")} value={t("subtaskDetail.durationValue", { count: row.durationDays })} />
          {dateRange && <MetaTag label={t("subtaskDetail.dateLabel")} value={dateRange} />}
          <MetaTag label={t("subtaskDetail.statusLabel")} value={row.completed ? t("subtaskDetail.statusDone") : t("subtaskDetail.statusDoing")} color={row.completed ? T.green : T.accent} />
        </div>

        {/* Description */}
        <div style={{ background: T.soft, borderRadius: 10, padding: "12px 14px", color: row.description ? T.ink : T.muted, fontSize: 13, lineHeight: 1.65 }}>
          {row.description || t("subtaskDetail.noDescription")}
        </div>

        {/* AI 学习 Prompt：搜索无验证资源时作为主要学习入口，有资源时作为补充 */}
        <div style={{
          borderRadius: 10, padding: "12px 14px",
          background: hasVerified ? T.soft : "rgba(59,122,255,0.05)",
          border: hasVerified ? `1px solid ${T.line}` : "1px solid rgba(59,122,255,0.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 15 }}>🤖</span>
            <span style={{ color: T.ink, fontSize: 12, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {hasVerified ? t("subtaskDetail.aiTitleWithRes") : t("subtaskDetail.aiTitleNoRes")}
            </span>
          </div>
          <div style={{ color: T.muted, fontSize: 11, lineHeight: 1.5, marginBottom: 9 }}>
            {t("subtaskDetail.aiDesc")}
          </div>
          <button
            onClick={handleCopyPrompt}
            style={{
              width: "100%",
              background: copied ? T.green : T.accent,
              color: "#fff", border: "none", borderRadius: 9,
              padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.2s",
            }}
          >
            {copied ? t("subtaskDetail.copied") : t("subtaskDetail.copyPrompt")}
          </button>
        </div>

        {/* Resources */}
        {resources.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {/* 资源标题 + 可信度说明 */}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: T.muted, fontSize: 11, fontWeight: 600, letterSpacing: "0.03em" }}>{t("subtaskDetail.recommendedRes")}</span>
              {hasVerified && (
                <span style={{ fontSize: 9, fontWeight: 600, color: T.green, background: "rgba(47,93,80,0.1)", border: "1px solid rgba(47,93,80,0.2)", borderRadius: 4, padding: "1px 6px" }}>
                  {t("subtaskDetail.verifiedCount", { count: verifiedCount })}
                </span>
              )}
              {!hasVerified && resources.length > 0 && (
                <span style={{ fontSize: 9, color: T.muted, background: T.soft, border: `1px solid ${T.line}`, borderRadius: 4, padding: "1px 6px" }}>
                  {t("subtaskDetail.clickToSearch")}
                </span>
              )}
            </div>

            {resources.map((r, i) => {
              // 确定 trust_level（兼容旧数据）
              const trustLevel: "verified" | "search_only" =
                r.trust_level ?? (r.url ? "verified" : "search_only");
              const cfg = TRUST_CONFIG[trustLevel];
              const clickable = !!(r.url || r.searchQuery);
              const typeIcon = r.type === "course" ? "📚" : r.type === "search" ? "🔎" : r.type === "person" ? "👤" : "🔗";

              // 三维信号
              const urlStatusKey = (r.url_status ?? "unchecked") as keyof typeof URL_STATUS_CONFIG;
              const statusCfg = URL_STATUS_CONFIG[urlStatusKey] ?? URL_STATUS_CONFIG.unchecked;
              const freshKey = (r.freshness ?? "unknown") as keyof typeof FRESHNESS_CONFIG;
              const freshCfg = FRESHNESS_CONFIG[freshKey];
              const authLabel = (r.authority_label ?? "unknown") as keyof typeof AUTHORITY_LABEL_CONFIG;
              const authCfg = AUTHORITY_LABEL_CONFIG[authLabel];
              const hasValidation = r.url_status !== undefined;
              const isDead = r.url_status === "not_found" || r.url_status === "dead";

              return (
                <div
                  key={i}
                  onClick={clickable && !isDead ? () => {
                    const targetUrl = r.resolved_url ?? r.url;
                    if (targetUrl) openExternalUrl(targetUrl);
                    else if (r.searchQuery) window.open(`https://www.google.com/search?q=${encodeURIComponent(r.searchQuery)}`, "_blank", "noopener,noreferrer");
                  } : undefined}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 9,
                    padding: "9px 11px",
                    background: isDead ? "rgba(192,57,43,0.05)" : cfg.bg,
                    border: `1px solid ${isDead ? "rgba(192,57,43,0.25)" : cfg.border}`,
                    borderRadius: 9,
                    cursor: (clickable && !isDead) ? "pointer" : "default",
                    opacity: isDead ? 0.7 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{typeIcon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* 标题行 + trust徽章 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span style={{ color: isDead ? T.muted : T.ink, fontSize: 12, fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: cfg.badgeColor, background: cfg.badgeBg, borderRadius: 4, padding: "1px 5px", flexShrink: 0 }}>
                        {t(trustLevel === "verified" ? "subtaskDetail.trustVerified" : "subtaskDetail.trustSearch")}
                      </span>
                    </div>

                    {/* 三维信号徽章行 */}
                    {hasValidation && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, flexWrap: "wrap" }}>
                        {/* URL 状态 */}
                        <span style={{
                          fontSize: 9, fontWeight: 600, color: statusCfg.color,
                          background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
                          borderRadius: 4, padding: "1px 5px",
                        }}>
                          {statusCfg.icon} {statusCfg.label}
                        </span>

                        {/* 域名权威分 */}
                        {r.authority_score !== undefined && (
                          <span style={{
                            fontSize: 9, fontWeight: 600,
                            color: r.authority_score >= 8 ? "#2F5D50" : r.authority_score >= 5 ? "#8B6A2E" : "#777B75",
                            background: r.authority_score >= 8 ? "rgba(47,93,80,0.08)" : r.authority_score >= 5 ? "rgba(139,106,46,0.08)" : "rgba(119,123,117,0.07)",
                            border: `1px solid ${r.authority_score >= 8 ? "rgba(47,93,80,0.2)" : r.authority_score >= 5 ? "rgba(139,106,46,0.2)" : "rgba(119,123,117,0.2)"}`,
                            borderRadius: 4, padding: "1px 5px",
                          }}>
                            {authCfg.icon} {authCfg.label} {r.authority_score}/10
                          </span>
                        )}

                        {/* 新鲜度 */}
                        {r.freshness && r.freshness !== "unknown" && (
                          <span style={{
                            fontSize: 9, fontWeight: 600, color: freshCfg.color,
                            background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)",
                            borderRadius: 4, padding: "1px 5px",
                          }}>
                            {freshCfg.icon} {freshCfg.label}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 平台 + 作者 */}
                    {r.platform && <div style={{ color: T.muted, fontSize: 10, marginBottom: 1 }}>{r.platform}</div>}
                    {r.author && <div style={{ color: T.muted, fontSize: 10 }}>👤 {r.author}</div>}

                    {/* 内容摘要 */}
                    {r.snippet && (
                      <div style={{ color: T.muted, fontSize: 10, marginTop: 3, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                        {r.snippet}
                      </div>
                    )}

                    {/* URL / 搜索词 */}
                    {!isDead && (r.resolved_url ?? r.url) && (
                      <div style={{ color: cfg.arrowColor, fontSize: 10, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.resolved_url ?? r.url}
                      </div>
                    )}
                    {isDead && (
                      <div style={{ color: "#C0392B", fontSize: 10, marginTop: 3 }}>
                        {t("subtaskDetail.deadLink")}
                      </div>
                    )}
                    {!r.url && r.searchQuery && (
                      <div style={{ color: cfg.arrowColor, fontSize: 10, marginTop: 3, fontFamily: "var(--font-geist-mono), monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t("subtaskDetail.search", { query: r.searchQuery })}
                      </div>
                    )}
                  </div>
                  {(clickable && !isDead) && <span style={{ color: cfg.arrowColor, fontSize: 12, flexShrink: 0, marginTop: 2 }}>→</span>}
                  {isDead && <span style={{ color: "#C0392B", fontSize: 12, flexShrink: 0, marginTop: 2 }}>✕</span>}
                </div>
              );
            })}

            {/* 可信度图例 */}
            <div style={{ display: "flex", gap: 8, paddingTop: 2, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
                <span style={{ color: T.muted, fontSize: 10 }}>{t("subtaskDetail.legendAccessible")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: T.orange, flexShrink: 0 }} />
                <span style={{ color: T.muted, fontSize: 10 }}>{t("subtaskDetail.legendSearch")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, color: T.muted }}>{t("subtaskDetail.legendAuthority")}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, color: T.muted }}>{t("subtaskDetail.legendFreshness")}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {/* 「开始学习」CTA —— 取第一个可访问资源 */}
        {(() => {
          const firstResource = resources.find(r => !!(r.resolved_url ?? r.url) && r.url_status !== "not_found" && r.url_status !== "dead");
          const firstUrl = firstResource ? (firstResource.resolved_url ?? firstResource.url) : undefined;
          if (!firstUrl || row.completed) return null;
          return (
            <button
              onClick={() => {
                openExternalUrl(firstUrl);
              }}
              style={{
                width: "100%", background: T.accent, color: "#fff",
                border: "none", borderRadius: 10, padding: "12px 0",
                fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                boxShadow: "0 4px 14px rgba(59,122,255,0.25)",
              }}
            >
              <span>🚀</span> {t("subtaskDetail.startLearning")}
            </button>
          );
        })()}
        <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
          <button
            onClick={() => { onToggle(); onClose(); }}
            style={{
              flex: 1, border: `1px solid ${row.completed ? T.line : T.accent}`,
              background: row.completed ? T.soft : T.accent,
              color: row.completed ? T.muted : "#fff",
              borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {row.completed ? t("subtaskDetail.markUndone") : t("subtaskDetail.markDone")}
          </button>
          <button onClick={onOpenTask} style={{ background: T.soft, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, cursor: "pointer" }}>
            {t("subtaskDetail.openTask")}
          </button>
        </div>
      </div>
    </>
  );
}

function AttrPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color, background: `${color}14`, border: `1px solid ${color}28`, borderRadius: 6, padding: "3px 8px" }}>
      {icon} {label}
    </span>
  );
}

function MetaTag({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#F1F2EE", borderRadius: 6, padding: "4px 9px" }}>
      <span style={{ color: "#777B75", fontSize: 11 }}>{label}</span>
      <span style={{ color: color ?? "#111111", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-geist-mono), monospace" }}>{value}</span>
    </div>
  );
}



