/**
 * npm / PyPI 包页面抓取
 *
 * npm:  调用 registry.npmjs.org JSON API（无需鉴权）
 * PyPI: 调用 pypi.org/pypi/<package>/json API
 *
 * 提取内容：
 *   - 包名、版本、描述
 *   - 依赖列表（生产依赖）
 *   - 关键词/分类
 *   - 周下载量（npm）/ 作者
 *   - 主页 / 仓库链接
 */

import type { FetchedContent } from "../url-fetcher";

// ─── npm ─────────────────────────────────────────────────────────────────

interface NpmPackage {
  name: string;
  description: string;
  "dist-tags"?: { latest?: string };
  versions?: Record<string, { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>;
  readme?: string;
  keywords?: string[];
  homepage?: string;
  repository?: { url?: string };
  author?: { name?: string } | string;
}

function extractNpmPackageName(url: string): string | null {
  // https://www.npmjs.com/package/@scope/name
  // https://www.npmjs.com/package/name
  const m = url.match(/npmjs\.com\/package\/(@?[^/?#]+(?:\/[^/?#]+)?)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export async function fetchNpm(url: string): Promise<FetchedContent | null> {
  const pkgName = extractNpmPackageName(url);
  if (!pkgName) return null;

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName).replace("%40", "@")}`, {
      headers: { "Accept": "application/json", "User-Agent": "AutoTask/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json() as NpmPackage;
    const latestVersion = data["dist-tags"]?.latest ?? "";
    const latestMeta = latestVersion ? data.versions?.[latestVersion] : undefined;
    const deps = latestMeta?.dependencies ? Object.keys(latestMeta.dependencies) : [];
    const devDeps = latestMeta?.devDependencies ? Object.keys(latestMeta.devDependencies).slice(0, 8) : [];

    // README 节选（清洗 Markdown）
    let readmeSnippet = "";
    if (data.readme) {
      readmeSnippet = data.readme
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/```[\s\S]*?```/g, "[code]")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 800);
    }

    const authorName = typeof data.author === "string"
      ? data.author
      : data.author?.name ?? "";

    const lines: string[] = [];
    lines.push(`📦 npm 包：${data.name}${latestVersion ? ` v${latestVersion}` : ""}`);
    if (data.description) lines.push(`📝 描述：${data.description}`);
    if (authorName) lines.push(`👤 作者：${authorName}`);
    if (data.homepage) lines.push(`🔗 主页：${data.homepage}`);
    if (data.keywords?.length) lines.push(`🏷 关键词：${data.keywords.slice(0, 10).join(", ")}`);

    if (deps.length) {
      lines.push("", `── 生产依赖（${deps.length} 个）──`);
      lines.push(deps.slice(0, 20).join(", ") + (deps.length > 20 ? ` ...等 ${deps.length} 个` : ""));
    }
    if (devDeps.length) {
      lines.push("", `── 开发依赖（节选）──`);
      lines.push(devDeps.join(", "));
    }
    if (readmeSnippet) {
      lines.push("", "── README 节选 ──", readmeSnippet);
    }

    const tags = [
      "npm",
      ...(data.keywords ?? []).slice(0, 6),
    ];

    return {
      url,
      urlType: "npm",
      title: `${data.name}${latestVersion ? ` v${latestVersion}` : ""}`,
      summary: lines.join("\n").slice(0, 2500),
      tags,
      rawPreview: data.description || readmeSnippet.slice(0, 300),
    };
  } catch {
    return null;
  }
}

// ─── PyPI ─────────────────────────────────────────────────────────────────

interface PypiInfo {
  info: {
    name: string;
    version: string;
    summary: string;
    description: string;
    author: string;
    author_email: string;
    home_page: string;
    project_url: string;
    keywords: string;
    classifiers: string[];
    requires_python: string;
    requires_dist: string[] | null;
  };
}

function extractPypiPackageName(url: string): string | null {
  // https://pypi.org/project/requests/
  // https://pypi.org/project/requests/2.31.0/
  const m = url.match(/pypi\.org\/project\/([^/?#/]+)/);
  return m ? m[1] : null;
}

function parsePypiCategories(classifiers: string[]): string[] {
  const topics: string[] = [];
  for (const c of classifiers) {
    if (c.startsWith("Topic ::")) {
      const parts = c.split(" :: ");
      const last = parts[parts.length - 1]?.trim();
      if (last && !topics.includes(last)) topics.push(last);
    }
  }
  return topics.slice(0, 8);
}

export async function fetchPypi(url: string): Promise<FetchedContent | null> {
  const pkgName = extractPypiPackageName(url);
  if (!pkgName) return null;

  try {
    const res = await fetch(`https://pypi.org/pypi/${pkgName}/json`, {
      headers: { "Accept": "application/json", "User-Agent": "AutoTask/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json() as PypiInfo;
    const info = data.info;

    // 依赖列表
    const deps = (info.requires_dist ?? [])
      .map(d => d.split(/[;\s>=<!\[]/)[0].trim())
      .filter(Boolean);
    const uniqueDeps = [...new Set(deps)];

    // Python 版本要求
    const pythonReq = info.requires_python ? `Python ${info.requires_python}` : "";

    // 分类标签
    const topics = parsePypiCategories(info.classifiers);
    const keywords = info.keywords ? info.keywords.split(/[,\s]+/).filter(Boolean).slice(0, 8) : [];

    // 长描述节选
    let descSnippet = "";
    if (info.description && info.description !== "UNKNOWN") {
      descSnippet = info.description
        .replace(/```[\s\S]*?```/g, "[code]")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 800);
    }

    const lines: string[] = [];
    lines.push(`🐍 PyPI 包：${info.name} v${info.version}`);
    if (info.summary && info.summary !== "UNKNOWN") lines.push(`📝 描述：${info.summary}`);
    if (info.author) lines.push(`👤 作者：${info.author}`);
    if (pythonReq) lines.push(`🐍 Python：${pythonReq}`);
    if (info.home_page && info.home_page !== "UNKNOWN") lines.push(`🔗 主页：${info.home_page}`);
    if (keywords.length) lines.push(`🏷 关键词：${keywords.join(", ")}`);
    if (topics.length) lines.push(`📂 分类：${topics.join(" · ")}`);

    if (uniqueDeps.length) {
      lines.push("", `── 依赖（${uniqueDeps.length} 个）──`);
      lines.push(uniqueDeps.slice(0, 20).join(", ") + (uniqueDeps.length > 20 ? ` ...等 ${uniqueDeps.length} 个` : ""));
    }

    if (descSnippet) {
      lines.push("", "── 包说明节选 ──", descSnippet);
    }

    const tags = ["PyPI", "Python", ...keywords.slice(0, 4), ...topics.slice(0, 3)];

    return {
      url,
      urlType: "pypi",
      title: `${info.name} v${info.version}`,
      summary: lines.join("\n").slice(0, 2500),
      tags,
      rawPreview: (info.summary || descSnippet).slice(0, 400),
    };
  } catch {
    return null;
  }
}

// ─── 检测 ─────────────────────────────────────────────────────────────────

export type PackageRegistry = "npm" | "pypi";

export function detectPackageRegistry(url: string): PackageRegistry | null {
  const u = url.toLowerCase();
  if (u.includes("npmjs.com/package/")) return "npm";
  if (u.includes("pypi.org/project/")) return "pypi";
  return null;
}
