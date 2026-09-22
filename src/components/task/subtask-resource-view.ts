import { openExternalUrl } from "@/lib/safe-url";

/**
 * 子任务资源视图 —— 解析 subtasks.resources（JSON: TrustableResource[]）。
 * 拾级两阶段检索会把资源分成两档：
 *   verified    代码经 Tavily 白名单检索到的真实 URL
 *   search_only 仅给出搜索词，用户点击时跳转搜索引擎自选
 */

export interface ResourceView {
  title: string;
  /** 来源：平台名 / 域名 / 作者 */
  source: string;
  verified: boolean;
  url: string | null;
  searchQuery: string | null;
  /** 域名权威分 0–10（三维校验字段，可能缺失） */
  authority: number | null;
  /** 校验后确认不可访问 */
  dead: boolean;
  clickable: boolean;
  kind: string;
}

interface RawResource {
  title?: string;
  type?: string;
  url?: string;
  resolved_url?: string;
  searchQuery?: string;
  platform?: string;
  author?: string;
  trust_level?: string;
  authority_score?: number;
  url_status?: string;
}

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function toResource(r: RawResource): ResourceView {
  const verified = (r.trust_level ?? (r.url ? "verified" : "search_only")) === "verified";
  const url = r.resolved_url || r.url || null;
  const searchQuery = r.searchQuery || null;
  const dead = r.url_status === "not_found" || r.url_status === "dead";
  return {
    title: r.title || url || searchQuery || "未命名资源",
    source: r.platform || hostOf(url) || r.author || "未知来源",
    verified,
    url,
    searchQuery,
    authority: typeof r.authority_score === "number" ? r.authority_score : null,
    dead,
    clickable: Boolean(url || searchQuery) && !dead,
    kind: r.type || "link",
  };
}

export function parseResources(raw: string | null | undefined): ResourceView[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => toResource((r ?? {}) as RawResource));
  } catch {
    return [];
  }
}

export function parseKeywords(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** 打开资源：verified 走真实 URL，search_only 跳转搜索引擎。 */
export function openResource(r: ResourceView): void {
  if (r.url) openExternalUrl(r.url);
  else if (r.searchQuery) {
    window.open(
      `https://www.google.com/search?q=${encodeURIComponent(r.searchQuery)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}
