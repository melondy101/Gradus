/**
 * resource-validator.ts
 *
 * 不依赖任何搜索 API 的三维资源可信度增强：
 *
 *   ① URL 存活验证  — HEAD 请求，判断 200/301→/403/404/timeout
 *   ② 域名权威分    — 静态权重表，官方文档 10 分 / 社区 7 分 / 博客 4 分
 *   ③ 内容新鲜度    — Last-Modified 响应头，< 6 月 HIGH / < 3 年 MEDIUM / 更旧 LOW
 *
 * 设计原则：
 *   - 全部并行执行（Promise.allSettled），单条超时不影响整体
 *   - 对 search_only 资源（无 URL）跳过验证，保持原样
 *   - 所有结果都是附加字段，不修改 trust_level（保持向后兼容）
 *   - 验证总耗时 ≤ 3 秒（并行 + 2s 单条超时）
 */

import type { TrustableResource } from "./tavily";
import { isSafePublicUrl } from "./ssrf-guard";

// ─── 类型扩展 ─────────────────────────────────────────────────────────────

export type UrlStatus =
  | "ok"              // 200 可直接访问
  | "redirect"        // 301/302 重定向（最终可达）
  | "login_required"  // 403 或 302→login / 200 含登录特征
  | "not_found"       // 404
  | "dead"            // 5xx 或网络错误
  | "timeout"         // 超时无响应
  | "unchecked";      // 未检测（search_only 资源）

export type FreshnessLevel = "high" | "medium" | "low" | "unknown";

export interface ResourceValidation {
  url_status: UrlStatus;
  /** 最终 URL（跟踪重定向后）*/
  resolved_url?: string;
  /** HTTP 状态码 */
  http_status?: number;
  /** 域名权威分 0–10 */
  authority_score: number;
  /** 域名权威标签 */
  authority_label: "official" | "community" | "platform" | "blog" | "unknown";
  /** 内容新鲜度 */
  freshness: FreshnessLevel;
  /** Last-Modified 日期字符串（原始值） */
  last_modified?: string;
  /** 验证耗时（ms） */
  checked_at: number;
}

export type ValidatedResource = TrustableResource & Partial<ResourceValidation>;

// ─── 域名权威分数据库 ─────────────────────────────────────────────────────

/**
 * 静态域名权威分表
 *
 * 评分维度说明：
 *   - 10: 一级官方文档/学术机构（无广告，内容由核心团队维护，引用可信度最高）
 *   - 8-9: 知名平台官方内容或权威社区（Google/Microsoft 官方，MDN 等）
 *   - 6-7: 主流学习平台（内容经过审核但有商业成分）
 *   - 4-5: 技术博客/社区问答（质量不一，需结合内容判断）
 *   - 2-3: 聚合站/SEO 内容农场（信噪比低）
 */
const DOMAIN_AUTHORITY: Record<string, { score: number; label: ResourceValidation["authority_label"] }> = {
  // ── 一级官方文档 (10) ────────────────────────────────────────────────────
  "docs.python.org":          { score: 10, label: "official" },
  "docs.rust-lang.org":       { score: 10, label: "official" },
  "docs.oracle.com":          { score: 10, label: "official" },
  "go.dev":                   { score: 10, label: "official" },
  "kotlinlang.org":           { score: 10, label: "official" },
  "swift.org":                { score: 10, label: "official" },
  "learn.microsoft.com":      { score: 10, label: "official" },
  "docs.microsoft.com":       { score: 10, label: "official" },
  "developer.apple.com":      { score: 10, label: "official" },
  "developer.android.com":    { score: 10, label: "official" },
  "tc39.es":                  { score: 10, label: "official" },
  "html.spec.whatwg.org":     { score: 10, label: "official" },
  "www.w3.org":               { score: 10, label: "official" },
  "arxiv.org":                { score: 10, label: "official" },
  "ocw.mit.edu":              { score: 10, label: "official" },
  "ocw.harvard.edu":          { score: 10, label: "official" },

  // ── 权威平台文档 (9) ─────────────────────────────────────────────────────
  "developer.mozilla.org":    { score: 9, label: "official" },
  "react.dev":                { score: 9, label: "official" },
  "vuejs.org":                { score: 9, label: "official" },
  "angular.io":               { score: 9, label: "official" },
  "nodejs.org":               { score: 9, label: "official" },
  "typescript-lang.org":      { score: 9, label: "official" },
  "typescriptlang.org":       { score: 9, label: "official" },
  "nextjs.org":               { score: 9, label: "official" },
  "tailwindcss.com":          { score: 9, label: "official" },
  "pytorch.org":              { score: 9, label: "official" },
  "tensorflow.org":           { score: 9, label: "official" },
  "scikit-learn.org":         { score: 9, label: "official" },
  "numpy.org":                { score: 9, label: "official" },
  "pandas.pydata.org":        { score: 9, label: "official" },
  "cloud.google.com":         { score: 9, label: "official" },
  "aws.amazon.com":           { score: 9, label: "official" },
  "docs.aws.amazon.com":      { score: 9, label: "official" },

  // ── 顶级学习平台 (8) ─────────────────────────────────────────────────────
  "khanacademy.org":          { score: 8, label: "platform" },
  "coursera.org":             { score: 8, label: "platform" },
  "edx.org":                  { score: 8, label: "platform" },
  "mit.edu":                  { score: 8, label: "platform" },
  "stanford.edu":             { score: 8, label: "platform" },
  "en.wikipedia.org":         { score: 8, label: "community" },
  "zh.wikipedia.org":         { score: 8, label: "community" },
  "mathworld.wolfram.com":    { score: 8, label: "official" },

  // ── 优质学习资源 (7) ─────────────────────────────────────────────────────
  "javascript.info":          { score: 7, label: "platform" },
  "realpython.com":           { score: 7, label: "platform" },
  "freecodecamp.org":         { score: 7, label: "platform" },
  "css-tricks.com":           { score: 7, label: "platform" },
  "web.dev":                  { score: 7, label: "official" },
  "leetcode.com":             { score: 7, label: "platform" },
  "hackerrank.com":           { score: 7, label: "platform" },
  "exercism.org":             { score: 7, label: "platform" },
  "brilliant.org":            { score: 7, label: "platform" },
  "3blue1brown.com":          { score: 7, label: "platform" },
  "missing.csail.mit.edu":    { score: 7, label: "official" },

  // ── 社区问答 (6) ────────────────────────────────────────────────────────
  "stackoverflow.com":        { score: 6, label: "community" },
  "github.com":               { score: 6, label: "community" },
  "dev.to":                   { score: 6, label: "community" },
  "hashnode.com":             { score: 6, label: "community" },

  // ── 视频平台 (5) ────────────────────────────────────────────────────────
  "youtube.com":              { score: 5, label: "platform" },
  "bilibili.com":             { score: 5, label: "platform" },

  // ── 入门教程站（内容有争议） (5) ────────────────────────────────────────
  "w3schools.com":            { score: 5, label: "platform" },
  "tutorialspoint.com":       { score: 4, label: "platform" },
  "geeksforgeeks.com":        { score: 4, label: "platform" },

  // ── 技术博客 (4) ────────────────────────────────────────────────────────
  "medium.com":               { score: 4, label: "blog" },
  "juejin.cn":                { score: 4, label: "blog" },
  "cnblogs.com":              { score: 4, label: "blog" },
  "zhihu.com":                { score: 4, label: "blog" },
  "segmentfault.com":         { score: 4, label: "blog" },
};

/** 从 URL 获取权威分，未知域名返回默认值 */
export function getDomainAuthority(url: string): Pick<ResourceValidation, "authority_score" | "authority_label"> {
  const map = (entry: { score: number; label: ResourceValidation["authority_label"] }) =>
    ({ authority_score: entry.score, authority_label: entry.label });

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // 精确匹配
    if (DOMAIN_AUTHORITY[hostname]) return map(DOMAIN_AUTHORITY[hostname]);
    // 子域名匹配（e.g. docs.python.org → already handled; try parent domain）
    const parts = hostname.split(".");
    for (let i = 1; i < parts.length - 1; i++) {
      const parent = parts.slice(i).join(".");
      if (DOMAIN_AUTHORITY[parent]) {
        // 子域名稍微降 1 分（除非是 docs/developer/learn 前缀，提升权威性）
        const base = DOMAIN_AUTHORITY[parent];
        const prefix = parts[i - 1];
        const bump = ["docs", "developer", "learn", "dev", "api", "reference"].includes(prefix) ? 1 : -1;
        return map({ score: Math.min(10, Math.max(0, base.score + bump)), label: base.label });
      }
    }
  } catch { /* ignore */ }
  return { authority_score: 3, authority_label: "unknown" };
}

// ─── 新鲜度计算 ───────────────────────────────────────────────────────────

function calcFreshness(lastModified: string | null): FreshnessLevel {
  if (!lastModified) return "unknown";
  try {
    const date = new Date(lastModified);
    if (isNaN(date.getTime())) return "unknown";
    const ageMs = Date.now() - date.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 180) return "high";    // < 6 个月
    if (ageDays < 1095) return "medium"; // < 3 年
    return "low";
  } catch {
    return "unknown";
  }
}

// ─── 登录墙检测 ───────────────────────────────────────────────────────────

const LOGIN_PATTERNS = [
  /login/i, /signin/i, /sign-in/i, /auth\//i,
  /账号登录/i, /请登录/i, /立即登录/i,
];

function isLoginRedirect(finalUrl: string): boolean {
  return LOGIN_PATTERNS.some(p => p.test(finalUrl));
}

// ─── 单条 URL 验证 ────────────────────────────────────────────────────────

async function validateUrl(url: string): Promise<ResourceValidation> {
  const authority = getDomainAuthority(url);
  const start = Date.now();

  // SSRF 防护：拒绝私网/环回/元数据地址，不对其发起请求
  if (!isSafePublicUrl(url)) {
    return { ...authority, url_status: "dead", freshness: "unknown", checked_at: 0 };
  }

  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "AutoTask/1.0 (resource-validator)" },
      signal: AbortSignal.timeout(2500),
    });

    const finalUrl = res.url || url;
    const httpStatus = res.status;
    const lastModifiedHeader = res.headers.get("last-modified");
    const freshness = calcFreshness(lastModifiedHeader);

    let urlStatus: UrlStatus;

    if (httpStatus === 200 || httpStatus === 206) {
      urlStatus = isLoginRedirect(finalUrl) ? "login_required" : "ok";
    } else if (httpStatus === 301 || httpStatus === 302 || httpStatus === 307 || httpStatus === 308) {
      // fetch follow=true 已追踪，若还是 3xx 说明循环
      urlStatus = "redirect";
    } else if (httpStatus === 401 || httpStatus === 403) {
      urlStatus = "login_required";
    } else if (httpStatus === 404 || httpStatus === 410) {
      urlStatus = "not_found";
    } else if (httpStatus >= 500) {
      urlStatus = "dead";
    } else {
      urlStatus = "ok";
    }

    return {
      ...authority,
      url_status: urlStatus,
      resolved_url: finalUrl !== url ? finalUrl : undefined,
      http_status: httpStatus,
      freshness,
      last_modified: lastModifiedHeader ?? undefined,
      checked_at: Date.now() - start,
    };
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.message.includes("timeout"));
    return {
      ...authority,
      url_status: isTimeout ? "timeout" : "dead",
      freshness: "unknown",
      checked_at: Date.now() - start,
    };
  }
}

// ─── 批量验证入口 ─────────────────────────────────────────────────────────

/**
 * 批量验证资源列表，原地附加验证字段。
 *
 * - 只验证有 url 的资源（search_only 跳过）
 * - 全部并行，单条 2.5s 超时
 * - 总耗时通常 < 3s（受最慢的单条决定）
 *
 * @param resources  原始资源数组（直接修改，返回同一引用）
 */
export async function validateResources(resources: TrustableResource[]): Promise<ValidatedResource[]> {
  const toCheck = resources
    .map((r, i) => ({ r, i, url: r.url }))
    .filter((item): item is { r: TrustableResource; i: number; url: string } => !!item.url);

  const results = await Promise.allSettled(
    toCheck.map(({ url }) => validateUrl(url))
  );

  const validated = resources as ValidatedResource[];

  results.forEach((result, idx) => {
    const i = toCheck[idx].i;
    if (result.status === "fulfilled") {
      Object.assign(validated[i], result.value);
    } else {
      // Promise 本身 reject（不应该发生，因为 validateUrl 内部 catch 了）
      (validated[i] as ValidatedResource).url_status = "dead";
      (validated[i] as ValidatedResource).freshness = "unknown";
      const auth = getDomainAuthority(resources[i].url ?? "");
      (validated[i] as ValidatedResource).authority_score = auth.authority_score;
      (validated[i] as ValidatedResource).authority_label = auth.authority_label;
    }
  });

  // search_only 资源：填入域名权威分（无 URL 时给 0 分）
  resources.forEach((r, i) => {
    if (!r.url) {
      (validated[i] as ValidatedResource).url_status = "unchecked";
      (validated[i] as ValidatedResource).freshness = "unknown";
      (validated[i] as ValidatedResource).authority_score = 0;
      (validated[i] as ValidatedResource).authority_label = "unknown";
    }
  });

  return validated;
}

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
  ok:             { icon: "✓", label: "可访问",  color: "#2F5D50", bg: "rgba(47,93,80,0.08)",  border: "rgba(47,93,80,0.2)",  warn: false },
  redirect:       { icon: "↪", label: "跳转",    color: "#3B7AFF", bg: "rgba(59,122,255,0.07)", border: "rgba(59,122,255,0.2)", warn: false },
  login_required: { icon: "🔒", label: "需登录",  color: "#8B6A2E", bg: "rgba(224,123,42,0.08)", border: "rgba(224,123,42,0.2)", warn: false },
  not_found:      { icon: "✕", label: "404",     color: "#C0392B", bg: "rgba(192,57,43,0.07)",  border: "rgba(192,57,43,0.2)", warn: true  },
  dead:           { icon: "✕", label: "无法访问", color: "#C0392B", bg: "rgba(192,57,43,0.07)",  border: "rgba(192,57,43,0.2)", warn: true  },
  timeout:        { icon: "⏱", label: "超时",    color: "#777B75", bg: "rgba(119,123,117,0.07)", border: "rgba(119,123,117,0.2)", warn: false },
  unchecked:      { icon: "◯", label: "搜索词",  color: "#E07B2A", bg: "rgba(224,123,42,0.07)", border: "rgba(224,123,42,0.2)", warn: false },
};

export const FRESHNESS_CONFIG: Record<FreshnessLevel, { icon: string; label: string; color: string }> = {
  high:    { icon: "🟢", label: "近期更新",  color: "#2F5D50" },
  medium:  { icon: "🟡", label: "1-3年前",   color: "#8B6A2E" },
  low:     { icon: "🔴", label: "3年以上",   color: "#C0392B" },
  unknown: { icon: "⚪", label: "时间未知",  color: "#777B75" },
};

export const AUTHORITY_LABEL_CONFIG: Record<ResourceValidation["authority_label"], { icon: string; label: string }> = {
  official:  { icon: "🏛", label: "官方" },
  platform:  { icon: "📚", label: "平台" },
  community: { icon: "👥", label: "社区" },
  blog:      { icon: "✍", label: "博客" },
  unknown:   { icon: "❓", label: "未知" },
};
