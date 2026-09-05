/**
 * url-fetcher.ts
 *
 * URL 内容抓取与结构化提取
 *
 * 设计目标：
 *   当用户输入包含 URL 时，在 AI 分析之前先抓取真实内容，
 *   再将内容注入 Prompt，让 AI 基于实际页面而非猜测来规划学习路径。
 *
 * 支持的 URL 类型：
 *   - GitHub 仓库/文件  → GitHub API + raw 内容
 *   - arXiv 论文        → abs 页摘要 + ar5iv 章节
 *   - 掘金/知乎/Medium  → 平台专属正文提取
 *   - Coursera/edX      → 课程大纲 + 评价 + 技能
 *   - npm/PyPI          → 包描述 + 依赖列表
 *   - PDF 直链          → 元数据 + 前几页文字（无第三方依赖）
 *   - Bilibili          → 公开 API 拿标题+简介+UP主+标签
 *   - 语雀/飞书         → API Token 读取私有文档（降级为友好提示）
 *   - 视频平台          → 标题+描述（无字幕）
 *   - 普通网页/文档     → title + meta + 正文
 *   - JS 渲染页面       → 识别平台 + 友好引导提示（不再静默返回空）
 *
 * 降级策略：
 *   任何抓取失败 → 返回 null，主流程继续但不注入内容（不阻断任务创建）
 *   JS 渲染 / 私有文档 → 返回包含引导提示的 FetchedContent（不返回 null）
 */

import { fetchArxiv } from "./fetchers/arxiv";
import { isSafePublicUrl, safeFetch } from "./ssrf-guard";
import { fetchArticle } from "./fetchers/article";
import { fetchCourse } from "./fetchers/course";
import { fetchNpm, fetchPypi } from "./fetchers/package";
import { fetchPdf, isPdfUrl } from "./fetchers/pdf";
import { fetchBilibili } from "./fetchers/bilibili";
import { fetchWorkspaceDoc } from "./fetchers/workspace";
import { fetchWithFallback, isEmptyShell, detectJsRenderedPlatform } from "./fetchers/fallback";

// ─── 类型定义 ────────────────────────────────────────────────────────────

export type UrlType =
  | "github_repo"
  | "github_file"
  | "arxiv"
  | "juejin"
  | "zhihu"
  | "medium"
  | "coursera"
  | "edx"
  | "npm"
  | "pypi"
  | "pdf"
  | "bilibili"
  | "youtube"
  | "yuque"
  | "feishu"
  | "notion"
  | "article"
  | "docs"
  | "unknown";

export interface FetchedContent {
  url: string;
  urlType: UrlType;
  /** 页面/资源的主标题 */
  title: string;
  /** 主要内容摘要（最多 2000 字符，注入 Prompt 用）*/
  summary: string;
  /** 检测到的编程语言、框架、主题等 */
  tags: string[];
  /** 原始 README / 正文前 500 字符（调试用）*/
  rawPreview?: string;
}

// ─── URL 检测 ─────────────────────────────────────────────────────────────

/** 从任意字符串中提取第一个 URL */
export function extractUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
  return match ? match[0].replace(/[.,;!?)]+$/, "") : null;
}

/** 判断字符串是否主要是一个 URL（去掉 URL 后剩余 < 20 字符）*/
export function isUrlDominant(input: string): boolean {
  const url = extractUrl(input);
  if (!url) return false;
  const rest = input.replace(url, "").trim();
  return rest.length < 20;
}

/** 识别 URL 类型 */
export function detectUrlType(url: string): UrlType {
  const u = url.toLowerCase();

  // GitHub
  if (u.includes("github.com") || u.includes("raw.githubusercontent.com")) {
    if (u.includes("/blob/") || u.includes("raw.githubusercontent.com") || u.includes("/gist")) {
      return "github_file";
    }
    return "github_repo";
  }

  // arXiv
  if (u.includes("arxiv.org") || u.includes("ar5iv.org")) return "arxiv";

  // PDF 直链（扩展名检测优先）
  if (isPdfUrl(url)) return "pdf";

  // 视频平台
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("bilibili.com") || u.includes("b23.tv")) return "bilibili";

  // 课程平台
  if (u.includes("coursera.org")) return "coursera";
  if (u.includes("edx.org")) return "edx";

  // 包管理
  if (u.includes("npmjs.com/package/")) return "npm";
  if (u.includes("pypi.org/project/")) return "pypi";

  // 中文技术社区 & Medium
  if (u.includes("juejin.cn")) return "juejin";
  if (u.includes("zhihu.com")) return "zhihu";
  if (u.match(/\bmedium\.com\b/) || u.match(/\w+\.medium\.com/)) return "medium";

  // 文档协作平台
  if (u.includes("yuque.com")) return "yuque";
  if (u.includes("feishu.cn") || u.includes("larkoffice.com") || u.includes("larksuite.com")) return "feishu";
  if (u.includes("notion.so") || u.includes("notion.site")) return "notion";

  // 技术文档
  if (
    u.includes("docs.") || u.includes("/docs/") || u.includes("documentation") ||
    u.includes("developer.mozilla") || u.includes("readthedocs") || u.includes("docs.python")
  ) return "docs";

  return "article";
}

// ─── GitHub API 抓取 ──────────────────────────────────────────────────────

interface GithubRepoInfo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  topics: string[];
  default_branch: string;
}

async function fetchGithubRepo(url: string): Promise<FetchedContent | null> {
  // 解析 owner/repo
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) return null;
  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, "");

  const TIMEOUT = 8000;

  try {
    // 1. 仓库基本信息
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "AutoTask/1.0" },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!repoRes.ok) return null;
    const repoInfo = await repoRes.json() as GithubRepoInfo;

    // 2. README 内容（raw）
    let readmeText = "";
    try {
      const readmeRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repoName}/${repoInfo.default_branch}/README.md`,
        { signal: AbortSignal.timeout(TIMEOUT) }
      );
      if (readmeRes.ok) {
        const raw = await readmeRes.text();
        // 清理 Markdown：去掉图片、badge、HTML 标签、多余空行
        readmeText = raw
          .replace(/!\[.*?\]\(.*?\)/g, "")        // 图片
          .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "") // badge 链接
          .replace(/<[^>]+>/g, " ")                // HTML 标签
          .replace(/```[\s\S]*?```/g, "[code block]") // 代码块
          .replace(/\n{3,}/g, "\n\n")              // 多余空行
          .trim()
          .slice(0, 3000);                         // 最多 3000 字符
      }
    } catch { /* README 抓取失败不影响仓库信息 */ }

    // 构建摘要
    const lines: string[] = [];
    lines.push(`📦 仓库：${repoInfo.full_name}`);
    if (repoInfo.description) lines.push(`📝 描述：${repoInfo.description}`);
    if (repoInfo.language) lines.push(`💻 主要语言：${repoInfo.language}`);
    if (repoInfo.stargazers_count > 0) lines.push(`⭐ Stars：${repoInfo.stargazers_count.toLocaleString()}`);
    if (repoInfo.topics?.length > 0) lines.push(`🏷 Tags：${repoInfo.topics.join(", ")}`);
    if (readmeText) {
      lines.push("", "── README 内容（节选）──", readmeText.slice(0, 1500));
    }

    const tags = [
      repoInfo.language,
      ...(repoInfo.topics ?? []),
    ].filter(Boolean) as string[];

    return {
      url,
      urlType: "github_repo",
      title: repoInfo.full_name,
      summary: lines.join("\n").slice(0, 2000),
      tags,
      rawPreview: readmeText.slice(0, 500),
    };
  } catch {
    return null;
  }
}

// ─── 普通网页/文档抓取 ────────────────────────────────────────────────────

/** 从 HTML 中提取可读文本 */
function extractTextFromHtml(html: string): { title: string; body: string } {
  // 提取 <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
    : "";

  // 提取 meta description
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
  const metaDesc = metaMatch ? metaMatch[1].trim() : "";

  // 移除 script/style/nav/header/footer
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const body = (metaDesc ? metaDesc + "\n\n" : "") + cleaned.slice(0, 2000);
  return { title, body };
}

async function fetchWebPage(url: string, urlType: UrlType): Promise<FetchedContent | null> {
  try {
    // safeFetch：手动跟随重定向并逐跳校验，防止 302 跳转到内网绕过 SSRF 防护
    const res = await safeFetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AutoTask/1.0; +https://talk-task.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";

    // PDF Content-Type → 转交 PDF 抓取器
    if (contentType.includes("pdf")) {
      return await fetchPdf(url);
    }

    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    const { title, body } = extractTextFromHtml(html);

    // 检测空壳（JS 渲染）
    if (isEmptyShell(html, body)) {
      return fetchWithFallback(url, urlType);
    }

    // 检测是否是已知 JS 渲染平台（即使拿到了少量文字，也给出提示）
    const jsPlatform = detectJsRenderedPlatform(url);
    if (jsPlatform && body.trim().length < 300) {
      return fetchWithFallback(url, urlType);
    }

    // 推断 tags
    const tags: string[] = [];
    if (url.includes("python")) tags.push("Python");
    if (url.includes("javascript") || url.includes("js.")) tags.push("JavaScript");
    if (url.includes("react")) tags.push("React");
    if (url.includes("math") || url.includes("数学")) tags.push("数学");

    return {
      url,
      urlType,
      title: title || url,
      summary: `📄 标题：${title}\n🌐 URL：${url}\n\n${body}`.slice(0, 2000),
      tags,
      rawPreview: body.slice(0, 500),
    };
  } catch {
    return null;
  }
}

// ─── YouTube / Bilibili 处理 ──────────────────────────────────────────────

function buildVideoContent(url: string, urlType: "youtube" | "bilibili"): FetchedContent {
  const platform = urlType === "youtube" ? "YouTube" : "Bilibili";
  return {
    url,
    urlType,
    title: `${platform} 视频`,
    summary: `🎬 ${platform} 视频链接：${url}\n\n（视频内容无法直接抓取，请描述你想从这个视频学习的内容，AI 将根据视频平台和链接推断主题。）`,
    tags: [platform],
  };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

/**
 * 抓取 URL 内容并返回结构化数据
 * 任何错误都静默降级，返回 null
 */
export async function fetchUrlContent(url: string): Promise<FetchedContent | null> {
  // SSRF 防护：拒绝私网/环回/元数据地址与非 http(s) 协议
  if (!isSafePublicUrl(url)) return null;

  const urlType = detectUrlType(url);

  try {
    switch (urlType) {
      // ── GitHub ──────────────────────────────────────────────────────────
      case "github_repo":
        return await fetchGithubRepo(url);
      case "github_file": {
        const rawUrl = url
          .replace("github.com", "raw.githubusercontent.com")
          .replace("/blob/", "/");
        // 重写后的 URL 再次过 SSRF 校验（防御纵深）
        if (!isSafePublicUrl(rawUrl)) return null;
        return await fetchWebPage(rawUrl, "github_file");
      }

      // ── 学术论文 ────────────────────────────────────────────────────────
      case "arxiv":
        return await fetchArxiv(url);

      // ── 课程平台 ────────────────────────────────────────────────────────
      case "coursera":
        return await fetchCourse(url, "coursera");
      case "edx":
        return await fetchCourse(url, "edx");

      // ── 包管理平台 ──────────────────────────────────────────────────────
      case "npm":
        return await fetchNpm(url);
      case "pypi":
        return await fetchPypi(url);

      // ── 中文社区 & Medium ────────────────────────────────────────────────
      case "juejin":
        return await fetchArticle(url, "juejin");
      case "zhihu":
        return await fetchArticle(url, "zhihu");
      case "medium":
        return await fetchArticle(url, "medium");

      // ── 视频平台 ────────────────────────────────────────────────────────
      case "youtube":
        return buildVideoContent(url, "youtube");
      case "bilibili":
        return await fetchBilibili(url);

      // ── PDF 直链 ─────────────────────────────────────────────────────────
      case "pdf":
        return await fetchPdf(url);

      // ── 文档协作平台 ──────────────────────────────────────────────────────
      case "yuque":
        return await fetchWorkspaceDoc(url, "yuque");
      case "feishu":
        return await fetchWorkspaceDoc(url, "feishu");
      case "notion":
        return await fetchWithFallback(url, "notion");

      // ── 通用网页 ────────────────────────────────────────────────────────
      case "docs":
      case "article":
      default:
        return await fetchWebPage(url, urlType);
    }
  } catch {
    return null;
  }
}

/**
 * 把抓取内容格式化为注入 Prompt 的文本
 */
export function formatContentForPrompt(content: FetchedContent): string {
  const typeLabel: Record<UrlType, string> = {
    github_repo: "GitHub 仓库",
    github_file: "GitHub 文件",
    arxiv:       "arXiv 论文",
    juejin:      "掘金文章",
    zhihu:       "知乎文章",
    medium:      "Medium 文章",
    coursera:    "Coursera 课程",
    edx:         "edX 课程",
    npm:         "npm 包",
    pypi:        "PyPI 包",
    pdf:         "PDF 文档",
    bilibili:    "Bilibili 视频",
    youtube:     "YouTube 视频",
    yuque:       "语雀文档",
    feishu:      "飞书文档",
    notion:      "Notion 页面",
    article:     "网页文章",
    docs:        "技术文档",
    unknown:     "网页",
  };

  return [
    `【URL 内容已自动抓取】`,
    `类型：${typeLabel[content.urlType]}`,
    `标题：${content.title}`,
    content.tags.length > 0 ? `标签：${content.tags.join(", ")}` : "",
    ``,
    `── 内容摘要 ──`,
    content.summary,
  ].filter(s => s !== undefined && s !== null).join("\n").slice(0, 2500);
}
