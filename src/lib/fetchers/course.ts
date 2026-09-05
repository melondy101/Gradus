/**
 * Coursera / edX 课程页抓取
 *
 * 提取内容：
 *   - 课程标题、简介
 *   - 课程大纲（周/模块列表）
 *   - 讲师信息
 *   - 用户评分 & 评价数量
 *   - 技能标签
 *   - 难度级别 & 预计时长
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
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtml(m[1]).replace(/\s*[\|–|-]\s*(?:Coursera|edX).*$/i, "").trim() : "";
}

// ─── Coursera ─────────────────────────────────────────────────────────────

interface CourseInfo {
  title: string;
  description: string;
  instructor: string;
  rating: string;
  reviewCount: string;
  level: string;
  duration: string;
  skills: string[];
  syllabus: string[];
}

function parseCoursera(html: string): CourseInfo {
  const title = extractTitle(html);

  // 课程简介：meta description 或 og:description
  const metaM = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+(?:name=["']description["']|property=["']og:description["'])/i);
  const description = metaM ? metaM[1].trim().slice(0, 600) : "";

  // 评分：通常是 "4.8" 样式的数字，在 rating 附近
  const ratingM = html.match(/["'](?:averageRating|ratingValue)["']\s*:\s*["']?([\d.]+)["']?/i)
    || html.match(/(\d\.\d)\s*(?:stars?|out of 5)/i);
  const rating = ratingM ? ratingM[1] : "";

  // 评价数量
  const reviewM = html.match(/["'](?:ratingCount|reviewCount)["']\s*:\s*["']?([\d,]+)["']?/i)
    || html.match(/([\d,]+)\s*(?:ratings?|reviews?)/i);
  const reviewCount = reviewM ? reviewM[1] : "";

  // 讲师
  const instrM = html.match(/["']instructorName["']\s*:\s*["']([^"']+)["']/i)
    || html.match(/class="[^"]*instructor[^"]*"[^>]*>\s*<[^>]+>([^<]{3,50})<\//i);
  const instructor = instrM ? instrM[1].trim() : "";

  // 难度
  const levelM = html.match(/["'](?:difficultyLevel|level)["']\s*:\s*["']([\w\s]+)["']/i)
    || html.match(/(?:Beginner|Intermediate|Advanced|Mixed)/i);
  const level = levelM ? levelM[0].trim() : "";

  // 预计时长
  const durM = html.match(/["'](?:duration|timeToComplete)["']\s*:\s*["']([^"']{2,50})["']/i)
    || html.match(/(\d+\s*(?:weeks?|months?|hours?)[\s\w]*(?:to complete|total)?)/i);
  const duration = durM ? durM[1].trim() : "";

  // 技能标签
  const skills: string[] = [];
  const skillRe = /["']skill["']\s*:\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = skillRe.exec(html)) !== null && skills.length < 10) {
    skills.push(m[1].trim());
  }
  // 备用：<span class="...skill...">
  if (skills.length === 0) {
    const spanRe = /<span[^>]+class="[^"]*skill[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;
    while ((m = spanRe.exec(html)) !== null && skills.length < 10) {
      const s = stripHtml(m[1]).trim();
      if (s && s.length < 50) skills.push(s);
    }
  }

  // 课程大纲（周/模块）
  const syllabus: string[] = [];
  // JSON-LD syllabus
  const ldM = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ldM) {
    for (const block of ldM) {
      try {
        const json = JSON.parse(block.replace(/<[^>]+>/g, ""));
        if (json.hasCourseInstance || json.syllabusSections) {
          const sections = json.syllabusSections || json.hasCourseInstance || [];
          for (const s of sections.slice(0, 8)) {
            const name = s.name || s.title || "";
            if (name) syllabus.push(name);
          }
        }
      } catch { /* ignore */ }
    }
  }
  // 备用：<h3> 标题在 syllabus 区域
  if (syllabus.length === 0) {
    const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>/gi;
    while ((m = h3Re.exec(html)) !== null && syllabus.length < 10) {
      const t = stripHtml(m[1]).trim();
      if (t && t.length > 5 && t.length < 120) syllabus.push(t);
    }
  }

  return { title, description, instructor, rating, reviewCount, level, duration, skills, syllabus };
}

// ─── edX ──────────────────────────────────────────────────────────────────

function parseEdx(html: string): CourseInfo {
  // edX 结构与 Coursera 类似，复用大部分逻辑
  const base = parseCoursera(html);

  // edX 特有：course-info-header 区域
  const headerM = html.match(/class="[^"]*course-info[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (headerM && !base.description) {
    base.description = stripHtml(headerM[1]).slice(0, 600);
  }

  return base;
}

// ─── 构建 FetchedContent ───────────────────────────────────────────────────

function buildContent(url: string, info: CourseInfo, platform: "coursera" | "edx"): FetchedContent {
  const icon = platform === "coursera" ? "🎓" : "📚";
  const label = platform === "coursera" ? "Coursera" : "edX";

  const lines: string[] = [];
  lines.push(`${icon} ${label} 课程：${info.title}`);
  if (info.instructor) lines.push(`👤 讲师：${info.instructor}`);
  if (info.level)    lines.push(`📊 难度：${info.level}`);
  if (info.duration) lines.push(`⏱ 时长：${info.duration}`);

  if (info.rating || info.reviewCount) {
    const parts = [];
    if (info.rating) parts.push(`⭐ ${info.rating}/5`);
    if (info.reviewCount) parts.push(`${info.reviewCount} 条评价`);
    lines.push(parts.join("  "));
  }

  if (info.skills.length) {
    lines.push(`🛠 技能：${info.skills.join(" · ")}`);
  }

  if (info.description) {
    lines.push("", "── 课程介绍 ──", info.description);
  }

  if (info.syllabus.length) {
    lines.push("", "── 课程大纲 ──");
    info.syllabus.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  }

  const tags = [label, ...info.skills, info.level].filter(Boolean);

  return {
    url,
    urlType: platform,
    title: info.title || url,
    summary: lines.join("\n").slice(0, 2500),
    tags,
    rawPreview: info.description.slice(0, 500),
  };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

export type CoursePlatform = "coursera" | "edx";

export function detectCoursePlatform(url: string): CoursePlatform | null {
  const u = url.toLowerCase();
  if (u.includes("coursera.org")) return "coursera";
  if (u.includes("edx.org")) return "edx";
  return null;
}

export async function fetchCourse(url: string, platform: CoursePlatform): Promise<FetchedContent | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const info = platform === "coursera" ? parseCoursera(html) : parseEdx(html);
    return buildContent(url, info, platform);
  } catch {
    return null;
  }
}
