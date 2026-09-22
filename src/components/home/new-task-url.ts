// ─── 新建目标输入的 URL 识别（纯前端，不引入 url-fetcher 的服务端依赖）────
// 与 §8 Stage 0 的分工：这里只在客户端做「类型 + 能否完整抓取」的提示，
// 真正的内容抓取仍由 analyze 路由的 fetchUrlContent 负责（失败降级不阻断）。

import {
  BookMarked,
  ClipboardList,
  Component,
  Diamond,
  FileCode2,
  FileText,
  FolderGit2,
  Globe,
  GraduationCap,
  Languages,
  MessageCircle,
  MonitorPlay,
  NotebookPen,
  Package,
  PackageSearch,
  PenLine,
  Sigma,
  Square,
  Terminal,
  Tv,
  type LucideIcon,
} from "lucide-react";

export interface UrlHint {
  type: string;
  Icon: LucideIcon;
  /** 是否可以完整抓取内容（false = 仅推断主题，建议补充描述） */
  canFetch: boolean;
}

export function extractUrlClient(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
  return match ? match[0].replace(/[.,;!?)]+$/, "") : null;
}

export function detectUrlHint(url: string): UrlHint {
  const u = url.toLowerCase();
  const hit = (type: string, Icon: LucideIcon, canFetch = true): UrlHint => ({ type, Icon, canFetch });

  // GitHub
  if (u.includes("github.com") || u.includes("raw.githubusercontent.com")) {
    if (u.includes("/blob/") || u.includes("/gist")) return hit("github_file", FileCode2);
    return hit("github_repo", FolderGit2);
  }

  // arXiv 论文
  if (u.includes("arxiv.org") || u.includes("ar5iv.org")) return hit("arxiv", GraduationCap);

  // PDF 直链
  if (u.endsWith(".pdf") || u.includes(".pdf?") || u.includes(".pdf#")) return hit("pdf", FileText);

  // 视频平台
  if (u.includes("youtube.com") || u.includes("youtu.be")) return hit("youtube", MonitorPlay, false);
  if (u.includes("bilibili.com") || u.includes("b23.tv")) return hit("bilibili", Tv);

  // 课程平台
  if (u.includes("coursera.org")) return hit("coursera", GraduationCap);
  if (u.includes("edx.org")) return hit("edx", BookMarked);

  // 包管理
  if (u.includes("npmjs.com/package/")) return hit("npm", Package);
  if (u.includes("pypi.org/project/")) return hit("pypi", PackageSearch);

  // 中文技术社区
  if (u.includes("juejin.cn")) return hit("juejin", Diamond);
  if (u.includes("zhihu.com")) return hit("zhihu", MessageCircle);
  if (/\bmedium\.com\b/.test(u) || /\w+\.medium\.com/.test(u)) return hit("medium", PenLine);

  // 文档协作平台
  if (u.includes("notion.so") || u.includes("notion.site")) return hit("notion", Square, false);
  if (u.includes("yuque.com")) return hit("yuque", NotebookPen);
  if (u.includes("feishu.cn") || u.includes("larkoffice.com")) return hit("feishu", ClipboardList);

  // 技术文档
  if (u.includes("docs.") || u.includes("/docs/") || u.includes("developer.mozilla") || u.includes("readthedocs")) {
    return hit("docs", BookMarked);
  }

  return hit("article", Globe);
}

/** 示例目标快捷入口 */
export const EXAMPLE_GOALS: Array<{ key: string; Icon: LucideIcon }> = [
  { key: "python", Icon: Terminal },
  { key: "math", Icon: Sigma },
  { key: "english", Icon: Languages },
  { key: "react", Icon: Component },
];
