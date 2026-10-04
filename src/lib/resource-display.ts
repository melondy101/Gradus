import type { UrlStatus, FreshnessLevel, ResourceValidation } from "./resource-validator";

// ─── 前端展示辅助 ─────────────────────────────────────────────────────────

export interface StatusBadgeConfig {
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  /** 是否阻止用户点击（404/dead 时显示警告） */
  warn: boolean;
}

export const URL_STATUS_CONFIG: Record<UrlStatus, StatusBadgeConfig> = {
  ok:             { icon: "✓", label: "可访问",  color: "var(--success)", bg: "var(--success-soft)",  border: "var(--success)",  warn: false },
  redirect:       { icon: "↪", label: "跳转",    color: "var(--text-2)", bg: "var(--cream-light)", border: "var(--bd-field)", warn: false },
  login_required: { icon: "需", label: "需登录",  color: "var(--warning)", bg: "var(--warning-soft)", border: "var(--accent-deep)", warn: false },
  not_found:      { icon: "✕", label: "404",     color: "var(--error)", bg: "var(--error-soft)",  border: "var(--error)", warn: true  },
  dead:           { icon: "✕", label: "无法访问", color: "var(--error)", bg: "var(--error-soft)",  border: "var(--error)", warn: true  },
  timeout:        { icon: "迟", label: "超时",    color: "var(--text-3)", bg: "var(--cream-light)", border: "var(--bd-check)", warn: false },
  unchecked:      { icon: "◯", label: "搜索词",  color: "var(--text-2)", bg: "var(--cream)", border: "var(--accent-deep)", warn: false },
};

export const FRESHNESS_CONFIG: Record<FreshnessLevel, { icon: string; label: string; color: string }> = {
  high:    { icon: "新", label: "近期更新",  color: "var(--success)" },
  medium:  { icon: "中", label: "1-3年前",   color: "var(--warning)" },
  low:     { icon: "旧", label: "3年以上",   color: "var(--error)" },
  unknown: { icon: "⚪", label: "时间未知",  color: "var(--text-3)" },
};

export const AUTHORITY_LABEL_CONFIG: Record<ResourceValidation["authority_label"], { icon: string; label: string }> = {
  official:  { icon: "官", label: "官方" },
  platform:  { icon: "平", label: "平台" },
  community: { icon: "社", label: "社区" },
  blog:      { icon: "✍", label: "博客" },
  unknown:   { icon: "❓", label: "未知" },
};
