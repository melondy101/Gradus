/**
 * 掘金 / 知乎 / Medium 正文提取
 *
 * 每个平台都有固定的 DOM 结构，用正则精准定位正文区域，
 * 比通用 HTML 清洗效果好很多。
 */

import type { FetchedContent } from "../url-fetcher";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 从 HTML 中提取 <title> */
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).trim() : "";
}

// ─── 掘金 ─────────────────────────────────────────────────────────────────

function parseJuejin(html: string): { title: string; body: string; tags: string[] } {
  const title = extractTitle(html).replace(/\s*-\s*掘金.*$/, "").trim();

  // 掘金正文容器：class 包含 "article-content" 或 "markdown-body"
  const bodyM = html.match(/<div[^>]+class="[^"]*(?:article-content|markdown-body)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
    || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const body = bodyM ? stripHtml(bodyM[1]).slice(0, 3000) : "";

  // 标签：class="tag-list" 或 data-tag
  const tags: string[] = [];
  const tagRe = /class="[^"]*tag[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null && tags.length < 8) {
    const t = stripHtml(m[1]).trim();
    if (t && t.length < 30 && !t.includes("\n")) tags.push(t);
  }

  return { title, body, tags: [...new Set(tags)] };
}

// ─── 知乎 ─────────────────────────────────────────────────────────────────

function parseZhihu(html: string): { title: string; body: string; tags: string[] } {
  const title = extractTitle(html).replace(/\s*-\s*知乎.*$/, "").trim();

  // 知乎正文：RichText 或 Post-RichText
  const bodyM = html.match(/class="[^"]*(?:RichText|Post-RichText)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
    || html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const body = bodyM ? stripHtml(bodyM[1]).slice(0, 3000) : "";

  // 话题标签
  const tags: string[] = [];
  const topicRe = /<a[^>]+class="[^"]*TopicLink[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = topicRe.exec(html)) !== null && tags.length < 6) {
    const t = stripHtml(m[1]).trim();
    if (t) tags.push(t);
  }

  return { title, body, tags };
}

// ─── Medium ───────────────────────────────────────────────────────────────

function parseMedium(html: string): { title: string; body: string; tags: string[] } {
  const title = extractTitle(html).replace(/\s*[\|–-]\s*Medium.*$/, "").trim();

  // Medium 正文：<article> 或 class="pw-post-body-paragraph"
  const artM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  let body = "";
  if (artM) {
    body = stripHtml(artM[1]).slice(0, 3000);
  }

  // tags: <a href="/tag/...">
  const tags: string[] = [];
  const tagRe = /href="\/tag\/([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null && tags.length < 8) {
    tags.push(decodeURIComponent(m[1]).replace(/-/g, " "));
  }

  return { title, body, tags: [...new Set(tags)] };
}

// ─── 通用博客/文章 fallback ────────────────────────────────────────────────

function parseGenericArticle(html: string): { title: string; body: string; tags: string[] } {
  const title = extractTitle(html);

  // meta description
  const metaM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
  const meta = metaM ? metaM[1].trim() : "";

  // 尝试 <article>, <main>, 或 class 包含 content/post/entry 的 div
  const bodyM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
    || html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    || html.match(/<div[^>]+class="[^"]*(?:post|entry|content|body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const rawBody = bodyM ? stripHtml(bodyM[1]) : stripHtml(html.replace(/<(?:script|style|nav|header|footer)[\s\S]*?<\/(?:script|style|nav|header|footer)>/gi, ""));
  const body = (meta ? meta + "\n\n" : "") + rawBody.slice(0, 2500);

  return { title, body, tags: [] };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

export type ArticlePlatform = "juejin" | "zhihu" | "medium" | "article";

export function detectArticlePlatform(url: string): ArticlePlatform {
  const u = url.toLowerCase();
  if (u.includes("juejin.cn")) return "juejin";
  if (u.includes("zhihu.com")) return "zhihu";
  if (u.includes("medium.com") || u.includes(".medium.com")) return "medium";
  return "article";
}

const PLATFORM_LABELS: Record<ArticlePlatform, string> = {
  juejin: "掘金",
  zhihu: "知乎",
  medium: "Medium",
  article: "文章",
};

export async function fetchArticle(url: string, platform: ArticlePlatform): Promise<FetchedContent | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();

    let parsed: { title: string; body: string; tags: string[] };
    switch (platform) {
      case "juejin":  parsed = parseJuejin(html); break;
      case "zhihu":   parsed = parseZhihu(html); break;
      case "medium":  parsed = parseMedium(html); break;
      default:        parsed = parseGenericArticle(html); break;
    }

    const platformLabel = PLATFORM_LABELS[platform];
    const icon = platform === "juejin" ? "🔶" : platform === "zhihu" ? "🔵" : platform === "medium" ? "🟢" : "📰";

    const summary = [
      `${icon} ${platformLabel} 文章：${parsed.title}`,
      parsed.tags.length ? `🏷 标签：${parsed.tags.join(" · ")}` : "",
      "",
      "── 正文（节选）──",
      parsed.body,
    ].filter(Boolean).join("\n").slice(0, 2500);

    return {
      url,
      urlType: platform === "article" ? "article" : platform as "juejin" | "zhihu" | "medium",
      title: parsed.title || url,
      summary,
      tags: parsed.tags,
      rawPreview: parsed.body.slice(0, 500),
    };
  } catch {
    return null;
  }
}
