/**
 * arXiv 论文抓取
 * 支持:
 *   https://arxiv.org/abs/2301.00001
 *   https://arxiv.org/pdf/2301.00001
 *   https://ar5iv.org/abs/2301.00001  （HTML 版本，包含正文）
 */

import type { FetchedContent } from "../url-fetcher";

/** 从 URL 提取 arXiv ID */
function extractArxivId(url: string): string | null {
  const m = url.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5}(?:v\d+)?)/i)
    || url.match(/ar5iv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i);
  return m ? m[1] : null;
}

/** 清理 HTML → 纯文本 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 从 ar5iv HTML 中提取章节标题列表 */
function extractSections(html: string): string[] {
  const sections: string[] = [];
  // 匹配 <h2>, <h3> 中的章节名
  const re = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null && sections.length < 12) {
    const text = stripHtml(m[1]).trim();
    if (text && text.length < 100 && !text.match(/^\d+$/)) {
      sections.push(text);
    }
  }
  return sections;
}

/** 从 ar5iv HTML 中提取摘要正文 */
function extractAbstractFromHtml(html: string): string {
  const absMatch = html.match(/<(?:div|section)[^>]+class="[^"]*ltx_abstract[^"]*"[^>]*>([\s\S]*?)<\/(?:div|section)>/i);
  if (absMatch) return stripHtml(absMatch[1]).slice(0, 1200);
  return "";
}

/** 从 arXiv abs 页面提取摘要（无需 API） */
async function fetchAbsPage(arxivId: string): Promise<{ title: string; abstract: string; authors: string; categories: string[] }> {
  const res = await fetch(`https://arxiv.org/abs/${arxivId}`, {
    headers: { "User-Agent": "AutoTask/1.0 (research-reader)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("abs fetch failed");
  const html = await res.text();

  // title
  const titleM = html.match(/<h1[^>]+class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleM ? stripHtml(titleM[1]).replace(/^Title:\s*/i, "").trim() : "";

  // abstract
  const absM = html.match(/<blockquote[^>]+class="[^"]*abstract[^"]*"[^>]*>([\s\S]*?)<\/blockquote>/i);
  const abstract = absM ? stripHtml(absM[1]).replace(/^Abstract:\s*/i, "").trim().slice(0, 1500) : "";

  // authors
  const authM = html.match(/<div[^>]+class="[^"]*authors[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const authors = authM ? stripHtml(authM[1]).replace(/^Authors?:\s*/i, "").trim().slice(0, 200) : "";

  // categories/subjects
  const cats: string[] = [];
  const subM = html.match(/<td[^>]+class="[^"]*subjects[^"]*"[^>]*>([\s\S]*?)<\/td>/i);
  if (subM) {
    const text = stripHtml(subM[1]);
    // e.g. "cs.LG; cs.AI; stat.ML"
    const parts = text.split(/[;,]/).map(s => s.trim()).filter(Boolean).slice(0, 5);
    cats.push(...parts);
  }

  return { title, abstract, authors, categories: cats };
}

/** 尝试从 ar5iv 获取章节列表（HTML 版本） */
async function fetchSectionsFromAr5iv(arxivId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://ar5iv.org/abs/${arxivId}`, {
      headers: { "User-Agent": "AutoTask/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractSections(html);
  } catch {
    return [];
  }
}

export async function fetchArxiv(url: string): Promise<FetchedContent | null> {
  const arxivId = extractArxivId(url);
  if (!arxivId) return null;

  try {
    // 并行：abs 页摘要 + ar5iv 章节
    const [absData, sections] = await Promise.all([
      fetchAbsPage(arxivId),
      fetchSectionsFromAr5iv(arxivId),
    ]);

    const lines: string[] = [];
    lines.push(`📄 论文：${absData.title || arxivId}`);
    if (absData.authors) lines.push(`👥 作者：${absData.authors}`);
    if (absData.categories.length) lines.push(`🏷 领域：${absData.categories.join(" · ")}`);
    lines.push(`🔗 arXiv ID：${arxivId}`);

    if (absData.abstract) {
      lines.push("", "── 摘要 ──", absData.abstract);
    }

    if (sections.length > 0) {
      lines.push("", "── 章节结构 ──");
      sections.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
    }

    const tags = [
      ...absData.categories,
      "论文", "arXiv",
    ].filter(Boolean);

    return {
      url,
      urlType: "arxiv",
      title: absData.title || `arXiv:${arxivId}`,
      summary: lines.join("\n").slice(0, 2500),
      tags,
      rawPreview: absData.abstract.slice(0, 500),
    };
  } catch {
    return null;
  }
}
