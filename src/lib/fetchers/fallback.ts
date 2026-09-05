/**
 * 通用 fallback 增强
 *
 * 目标：
 *   对于无法静态抓取的 JS 渲染页面（Notion、Confluence、钉钉文档等），
 *   不再静默返回 null 或空内容，而是：
 *     1. 尝试 HEAD + 基础 HTML 抓取（拿到 title 和 og:description）
 *     2. 识别是否是已知 JS 渲染平台
 *     3. 返回包含平台名称、建议操作和已知标题的友好提示
 *
 * 已知 JS 渲染平台（fetch 只能拿到空壳的）：
 *   - Notion
 *   - Confluence (Atlassian)
 *   - 钉钉文档
 *   - Quip
 *   - 飞书（已在 workspace.ts 处理，此处作 fallback）
 *   - 其他 SPA 应用
 */

import type { FetchedContent, UrlType } from "../url-fetcher";

// ─── 已知 JS 渲染平台识别 ─────────────────────────────────────────────────

export interface JsRenderedPlatform {
  name: string;
  icon: string;
  /** 友好提示：告诉用户这个平台为什么抓不到，以及建议做什么 */
  hint: string;
  /** 是否支持通过 API Token 读取 */
  hasApiSupport: boolean;
  /** 获取 Token 的说明 */
  tokenGuide?: string;
}

const JS_RENDERED_PLATFORMS: Array<{
  matches: (url: string) => boolean;
  platform: JsRenderedPlatform;
}> = [
  {
    matches: (u) => u.includes("notion.so") || u.includes("notion.site"),
    platform: {
      name: "Notion",
      icon: "⬜",
      hint: "Notion 页面通过客户端 JS 渲染，无法直接抓取正文。",
      hasApiSupport: true,
      tokenGuide: "Notion API Token 获取方式：notion.so → Settings → Integrations → New integration",
    },
  },
  {
    matches: (u) => u.includes("atlassian.net") || u.includes("confluence"),
    platform: {
      name: "Confluence",
      icon: "🔷",
      hint: "Confluence 需要账号权限，无法公开抓取。",
      hasApiSupport: true,
      tokenGuide: "Confluence API Token：Atlassian Account Settings → Security → API tokens",
    },
  },
  {
    matches: (u) => u.includes("dingtalk.com") || u.includes("alidocs.dingtalk"),
    platform: {
      name: "钉钉文档",
      icon: "🔶",
      hint: "钉钉文档为私有文档，需要登录权限。",
      hasApiSupport: false,
      tokenGuide: "暂不支持 API 读取，请复制文档内容粘贴到输入框。",
    },
  },
  {
    matches: (u) => u.includes("quip.com"),
    platform: {
      name: "Quip",
      icon: "📋",
      hint: "Quip 文档为私有文档系统，无法直接抓取。",
      hasApiSupport: true,
      tokenGuide: "Quip API Token：quip.com → Account Settings → Personal Access Tokens",
    },
  },
  {
    matches: (u) => u.includes("shimo.im"),
    platform: {
      name: "石墨文档",
      icon: "📝",
      hint: "石墨文档内容通过 JS 动态加载，无法直接抓取。",
      hasApiSupport: false,
      tokenGuide: "建议复制文档内容粘贴到输入框，或截图描述文档主要内容。",
    },
  },
  {
    matches: (u) => u.includes("wolai.com"),
    platform: {
      name: "我来文档",
      icon: "📓",
      hint: "我来文档为 JS 渲染页面，无法直接抓取正文。",
      hasApiSupport: false,
    },
  },
];

export function detectJsRenderedPlatform(url: string): JsRenderedPlatform | null {
  const u = url.toLowerCase();
  for (const { matches, platform } of JS_RENDERED_PLATFORMS) {
    if (matches(u)) return platform;
  }
  return null;
}

// ─── 内容质量检测 ─────────────────────────────────────────────────────────

/**
 * 判断抓到的 HTML 是否是空壳（JS 渲染导致正文为空）
 * 特征：HTML 很大但可读文本极少，或包含特定 SPA 框架标记
 */
export function isEmptyShell(html: string, extractedBody: string): boolean {
  // 正文太少（< 100 字符）但 HTML 很大（> 5KB） → 典型 JS 渲染空壳
  if (extractedBody.trim().length < 100 && html.length > 5000) return true;

  // 包含 SPA 框架特征
  const spaMarkers = [
    'id="__next"',        // Next.js
    'id="__nuxt"',        // Nuxt.js
    'id="app"',           // Vue/React 通用
    "data-reactroot",     // React
    "__notion_data__",    // Notion
    "window.__confluence", // Confluence
  ];
  for (const marker of spaMarkers) {
    if (html.includes(marker) && extractedBody.trim().length < 200) return true;
  }

  return false;
}

// ─── 基础信息提取（适用于空壳页面）────────────────────────────────────────

export interface BasicPageInfo {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
}

export function extractBasicInfo(html: string): BasicPageInfo {
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleM ? titleM[1].replace(/&amp;/g, "&").replace(/\s{2,}/g, " ").trim() : "";

  // og:title 优先
  const ogTitleM = html.match(/property="og:title"[^>]+content="([^"]+)"/i)
    || html.match(/content="([^"]+)"[^>]+property="og:title"/i);
  const ogTitle = ogTitleM ? ogTitleM[1].trim() : "";

  // og:description 或 meta description
  const descM = html.match(/property="og:description"[^>]+content="([^"]{0,500})"/i)
    || html.match(/name="description"[^>]+content="([^"]{0,500})"/i)
    || html.match(/content="([^"]{0,500})"[^>]+name="description"/i);
  const description = descM ? descM[1].trim() : "";

  return {
    title: ogTitle || title,
    description,
  };
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

/**
 * 增强版通用 fallback
 * 在普通 fetchWebPage 抓取后，如果内容为空，调用此函数构建友好提示
 */
export async function fetchWithFallback(
  url: string,
  urlType: UrlType
): Promise<FetchedContent> {
  const jsPlatform = detectJsRenderedPlatform(url);
  let basicInfo: BasicPageInfo = { title: "", description: "" };

  // 尝试基础 fetch 拿 title 和 og 信息
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      basicInfo = extractBasicInfo(html);
    }
  } catch { /* ignore, 继续构建提示 */ }

  const platformName = jsPlatform?.name ?? "网页";
  const icon = jsPlatform?.icon ?? "🌐";
  const displayTitle = basicInfo.title || url;

  const lines: string[] = [];
  lines.push(`${icon} ${platformName}：${displayTitle}`);

  if (basicInfo.description) {
    lines.push(`📌 描述：${basicInfo.description}`);
  }

  if (jsPlatform) {
    lines.push("", `⚠ ${jsPlatform.hint}`);

    if (jsPlatform.hasApiSupport) {
      lines.push("", "💡 可以通过 API Token 读取此文档：");
      if (jsPlatform.tokenGuide) lines.push(`   ${jsPlatform.tokenGuide}`);
      lines.push("   配置路径：设置 → 集成 → 填入 Token");
    } else {
      lines.push("", "💡 建议操作：");
      if (jsPlatform.tokenGuide) lines.push(`   ${jsPlatform.tokenGuide}`);
      else lines.push("   请将文档内容复制到输入框，AI 将据此规划学习路径。");
    }
  } else {
    lines.push("", "⚠ 页面内容通过 JavaScript 动态加载，无法直接抓取正文。");
    lines.push("", "💡 你可以：");
    lines.push("   1. 复制页面的主要内容到输入框");
    lines.push("   2. 在任务描述中说明这个页面/文档的主题");
  }

  return {
    url,
    urlType,
    title: displayTitle || url,
    summary: lines.join("\n").slice(0, 2000),
    tags: jsPlatform ? [jsPlatform.name] : [],
    rawPreview: basicInfo.description.slice(0, 300),
  };
}
