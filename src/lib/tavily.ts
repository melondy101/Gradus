/**
 * Tavily 搜索封装
 *
 * 设计思路（两阶段分离原则，来自 SMU/arXiv 引用验证研究）：
 *   Stage 2 不再让 AI "凭空推荐资源"，而是：
 *     Step A — AI 只生成搜索意图（关键词 + 目标域名），不生成任何 URL
 *     Step B — 本模块用代码调用 Tavily API，从白名单域名里检索真实资源
 *     Step C — 把真实 URL + 摘要注入 PLAN_PROMPT，AI 只能引用代码拿到的资源
 *
 *   核心原则（同 Perplexity 架构）：
 *   "Citations are embedded before generation, not retrofitted post-generation."
 *   资源在 AI 写计划之前就已经是真实存在的，LLM 无法编造 URL。
 *
 * 配置：
 *   TAVILY_API_KEY — 在 .env 里配置，没有时自动降级为 searchQuery-only 模式
 *
 * 降级策略：
 *   有 Tavily Key → 真实搜索，trust_level = "verified"
 *   无 Tavily Key → 返回结构化搜索词，trust_level = "search_only"
 *                   用户点击时打开搜索引擎页面
 */

// ─── 资源类型（与 analyze/route.ts 保持一致，新增 trust_level）────────────

export interface TrustableResource {
  type: "link" | "search" | "person" | "course";
  title: string;
  url?: string;           // 只有 trust_level="verified" 时才存在
  searchQuery?: string;   // trust_level="search_only" 时用于跳转搜索
  author?: string;
  platform?: string;
  snippet?: string;       // Tavily 返回的内容摘要
  trust_level: "verified" | "search_only";
  learning_phase?: "input" | "practice" | "reference";
  suitable_for?: "beginner" | "intermediate" | "advanced" | "all";

  // ── 三维可信度增强字段（由 resource-validator.ts 填充）────────────────────
  /** HEAD 检测结果 */
  url_status?: "ok" | "redirect" | "login_required" | "not_found" | "dead" | "timeout" | "unchecked";
  /** HTTP 响应码 */
  http_status?: number;
  /** 重定向后的最终 URL */
  resolved_url?: string;
  /** 域名权威分 0–10 */
  authority_score?: number;
  /** 域名类别 */
  authority_label?: "official" | "platform" | "community" | "blog" | "unknown";
  /** 内容新鲜度 */
  freshness?: "high" | "medium" | "low" | "unknown";
  /** Last-Modified 原始值 */
  last_modified?: string;
}

// ─── 白名单域名表（按领域分类）─────────────────────────────────────────────

/**
 * 各学习领域的可信来源白名单。
 * 这些域名经过人工审核，内容质量稳定，URL 格式标准。
 * Tavily 检索时限定在这些域名内，消除幻觉 URL 的根源。
 */
export const DOMAIN_WHITELIST: Record<string, string[]> = {
  // 编程与技术
  "编程": [
    "developer.mozilla.org",
    "docs.python.org",
    "freecodecamp.org",
    "w3schools.com",
    "github.com",
    "stackoverflow.com",
    "realpython.com",
    "javascript.info",
    "docs.microsoft.com",
    "react.dev",
    "nodejs.org",
    "typescript-lang.org",
  ],
  // 数学与逻辑
  "数学": [
    "khanacademy.org",
    "brilliant.org",
    "mathworld.wolfram.com",
    "en.wikipedia.org",
    "ocw.mit.edu",
  ],
  // 语言学习
  "语言": [
    "duolingo.com",
    "bbc.co.uk",
    "lingvist.com",
    "theguardian.com",
    "en.wikipedia.org",
  ],
  // 自然科学
  "科学": [
    "khanacademy.org",
    "ocw.mit.edu",
    "coursera.org",
    "en.wikipedia.org",
    "pubs.acs.org",
  ],
  // 人文社科
  "人文": [
    "coursera.org",
    "edx.org",
    "en.wikipedia.org",
    "gutenberg.org",
    "jstor.org",
  ],
  // 通用教育平台（所有领域都加）
  "_common": [
    "coursera.org",
    "edx.org",
    "khanacademy.org",
    "en.wikipedia.org",
    "youtube.com",
  ],
};

/**
 * 根据主题类别获取搜索白名单域名列表
 */
export function getWhitelistDomains(topicCategory: string): string[] {
  const common = DOMAIN_WHITELIST["_common"];
  // 模糊匹配领域
  for (const [key, domains] of Object.entries(DOMAIN_WHITELIST)) {
    if (key === "_common") continue;
    if (topicCategory.includes(key) || key.includes(topicCategory)) {
      return [...new Set([...domains, ...common])];
    }
  }
  return common;
}

// ─── Tavily API 封装 ──────────────────────────────────────────────────────

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;       // 内容摘要
  score: number;         // 相关度分数 0~1
  published_date?: string;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
}

/**
 * 调用 Tavily API 搜索，返回结构化结果
 * 无 API Key 时直接返回 null（由上层降级处理）
 */
async function searchTavily(
  query: string,
  includeDomains: string[],
  maxResults = 3,
): Promise<TavilySearchResult[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        include_domains: includeDomains,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(8000), // 8秒超时
    });

    if (!res.ok) {
      console.warn(`[Tavily] HTTP ${res.status} for query: "${query}"`);
      return null;
    }

    const data = (await res.json()) as TavilyResponse;
    return data.results ?? null;
  } catch (err) {
    // 超时或网络错误：静默降级，不中断主流程
    console.warn("[Tavily] Search failed, falling back to search_only mode:", err);
    return null;
  }
}

// ─── 搜索意图（AI 在 Stage 2 生成的结构）──────────────────────────────────

export interface SearchIntent {
  query: string;         // 搜索关键词
  purpose: string;       // 这个搜索的用途（简短说明，用于前端展示）
  learning_phase: "input" | "practice" | "reference";
  suitable_for: "beginner" | "intermediate" | "advanced" | "all";
  resource_type: "course" | "doc" | "video" | "exercise" | "reference";
}

// ─── 核心函数：把搜索意图转换为可信资源 ─────────────────────────────────────

/**
 * 将 AI 生成的搜索意图转换为带 trust_level 的真实资源列表。
 *
 * 流程：
 *   1. 有 Tavily API Key → 真实搜索 → 返回 trust_level="verified" 资源
 *   2. 无 Tavily API Key → 返回 trust_level="search_only" 资源
 *      （用户点击时跳转到搜索引擎，自己选择）
 *
 * @param intents       AI 生成的搜索意图数组
 * @param topicCategory 主题类别（用于选择白名单域名）
 * @returns             带 trust_level 的资源数组
 */
export async function resolveResources(
  intents: SearchIntent[],
  topicCategory: string,
): Promise<TrustableResource[]> {
  const whitelistDomains = getWhitelistDomains(topicCategory);
  const results: TrustableResource[] = [];

  for (const intent of intents) {
    const tavilyResults = await searchTavily(intent.query, whitelistDomains, 2);

    if (tavilyResults && tavilyResults.length > 0) {
      // ✅ 有 Tavily 结果：trust_level = "verified"
      for (const r of tavilyResults) {
        results.push({
          type: resourceTypeFromUrl(r.url, intent.resource_type),
          title: r.title,
          url: r.url,                              // ← 代码检索到的真实 URL
          snippet: r.content.slice(0, 200),        // 内容摘要（最多 200 字符）
          platform: extractPlatformName(r.url),
          trust_level: "verified",                 // ← 经过实际 HTTP 检索验证
          learning_phase: intent.learning_phase,
          suitable_for: intent.suitable_for,
        });
      }
    } else {
      // ⚠️ 无 Tavily 或搜索失败：trust_level = "search_only"，给用户搜索词
      results.push({
        type: mapResourceType(intent.resource_type),
        title: intent.purpose,
        searchQuery: intent.query,                 // ← 用户点击时跳转搜索
        trust_level: "search_only",                // ← 未经 URL 验证
        learning_phase: intent.learning_phase,
        suitable_for: intent.suitable_for,
      });
    }
  }

  // 去重（同一 URL 不重复）
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = r.url ?? r.searchQuery ?? r.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── 工具函数 ─────────────────────────────────────────────────────────────

function extractPlatformName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    // 特殊平台友好名称映射
    const platformNames: Record<string, string> = {
      "developer.mozilla.org": "MDN",
      "docs.python.org": "Python 官方文档",
      "freecodecamp.org": "freeCodeCamp",
      "khanacademy.org": "Khan Academy",
      "coursera.org": "Coursera",
      "edx.org": "edX",
      "github.com": "GitHub",
      "stackoverflow.com": "Stack Overflow",
      "w3schools.com": "W3Schools",
      "ocw.mit.edu": "MIT OpenCourseWare",
      "en.wikipedia.org": "Wikipedia",
      "youtube.com": "YouTube",
      "realpython.com": "Real Python",
      "javascript.info": "javascript.info",
    };
    return platformNames[hostname] ?? hostname;
  } catch {
    return "";
  }
}

function resourceTypeFromUrl(
  url: string,
  hint: SearchIntent["resource_type"],
): TrustableResource["type"] {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "course";
  if (url.includes("coursera.org") || url.includes("edx.org")) return "course";
  if (hint === "doc" || hint === "reference") return "link";
  if (hint === "exercise") return "search";
  return "link";
}

function mapResourceType(
  rt: SearchIntent["resource_type"],
): TrustableResource["type"] {
  if (rt === "course" || rt === "video") return "course";
  if (rt === "exercise") return "search";
  return "link";
}
