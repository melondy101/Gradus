/**
 * 语雀 / 飞书文档抓取
 *
 * 两种模式：
 *
 * A. 公开文档（无需 Token）
 *    - 语雀公开知识库/文章：直接 fetch HTML，提取 meta + 正文
 *    - 飞书公开文档（feishu.cn/docx/...）：同上
 *
 * B. 私有文档（需要 API Token）
 *    - 语雀：使用 yuque.com Open API，Authorization: Token <YUQUE_TOKEN>
 *    - 飞书：使用 open.feishu.cn API，需要 app_access_token 或 user_access_token
 *
 * Token 存储方式：
 *    - 用户通过设置页面提供，存入 env / localStorage（前端不直接传给 AI）
 *    - 本模块从 process.env 读取：YUQUE_API_TOKEN / FEISHU_USER_TOKEN
 *    - 如果没有 Token，降级返回「需要配置 Token」的提示内容（不返回 null）
 */

import type { FetchedContent } from "../url-fetcher";

const TIMEOUT = 10000;

// ─── 语雀 ─────────────────────────────────────────────────────────────────

/**
 * 从语雀 URL 解析 namespace 和 slug
 * 支持：
 *   https://www.yuque.com/{user}/{book}/{doc}
 *   https://{user}.yuque.com/{book}/{doc}
 */
function parseYuqueUrl(url: string): { namespace: string; slug: string } | null {
  try {
    const u = new URL(url);
    // www.yuque.com/user/book/doc
    const wwwM = u.hostname === "www.yuque.com"
      ? u.pathname.match(/^\/([^/]+)\/([^/]+)\/([^/]+)/)
      : null;
    if (wwwM) return { namespace: `${wwwM[1]}/${wwwM[2]}`, slug: wwwM[3] };

    // user.yuque.com/book/doc
    const subM = u.hostname.match(/^([^.]+)\.yuque\.com$/);
    if (subM) {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return { namespace: `${subM[1]}/${parts[0]}`, slug: parts[1] };
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchYuque(url: string): Promise<FetchedContent | null> {
  const token = process.env.YUQUE_API_TOKEN;
  const parsed = parseYuqueUrl(url);

  // ── 有 Token → 调用 Open API ──────────────────────────────────────────
  if (token && parsed) {
    try {
      const apiUrl = `https://www.yuque.com/api/v2/repos/${parsed.namespace}/docs/${parsed.slug}`;
      const res = await fetch(apiUrl, {
        headers: {
          "X-Auth-Token": token,
          "User-Agent": "AutoTask/1.0",
        },
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) throw new Error(`yuque api ${res.status}`);

      const json = await res.json() as {
        data: {
          title: string;
          body_lake?: string;
          body?: string;
          description?: string;
          tags?: string[];
          word_count?: number;
          created_at: string;
          updated_at: string;
        };
      };
      const doc = json.data;

      // body_lake 是 Lark 格式，body 是 Markdown
      const bodyText = (doc.body ?? doc.body_lake ?? "")
        .replace(/!\[.*?\]\(.*?\)/g, "")   // 图片
        .replace(/```[\s\S]*?```/g, "[代码块]")
        .replace(/\*\*/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .slice(0, 2000);

      const lines = [
        `📝 语雀文档：${doc.title}`,
        doc.word_count ? `📊 字数：${doc.word_count}` : "",
        `🕐 更新：${doc.updated_at.slice(0, 10)}`,
        "",
        "── 文档内容（节选）──",
        bodyText,
      ].filter(Boolean);

      return {
        url,
        urlType: "yuque",
        title: doc.title,
        summary: lines.join("\n").slice(0, 2500),
        tags: ["语雀", ...(doc.tags ?? [])],
        rawPreview: bodyText.slice(0, 400),
      };
    } catch { /* 降级到公开抓取 */ }
  }

  // ── 无 Token 或 API 失败 → HTML 抓取（公开文档）+ 友好提示 ──────────────
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (res.ok) {
      const html = await res.text();
      const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleM ? titleM[1].replace(/\s*-\s*语雀.*$/, "").trim() : "语雀文档";

      // 语雀正文在 lake-content 或 ne-viewer 容器
      const bodyM = html.match(/class="[^"]*(?:lake-content|ne-viewer|doc-body)[^"]*"[^>]*>([\s\S]{100,5000}?)<\/div>/i);
      const body = bodyM
        ? bodyM[1].replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 1500)
        : "";

      const isPrivate = html.includes("需要登录") || html.includes("无权限") || body.length < 50;

      const summary = isPrivate
        ? [
            `📝 语雀文档：${title}`,
            "",
            "🔒 此文档需要登录或权限才能访问。",
            "",
            "💡 如需让 AI 读取私有语雀文档，请在设置中配置语雀 API Token：",
            "   设置 → 集成 → 语雀 → 填入 Token（在 yuque.com → 账户设置 → Token 获取）",
          ].join("\n")
        : [
            `📝 语雀文档：${title}`,
            "",
            "── 文档内容（节选）──",
            body,
          ].join("\n");

      return {
        url,
        urlType: "yuque",
        title,
        summary: summary.slice(0, 2000),
        tags: ["语雀"],
        rawPreview: body.slice(0, 300),
      };
    }
  } catch { /* ignore */ }

  // 完全失败 → 返回引导提示（不返回 null）
  return {
    url,
    urlType: "yuque",
    title: "语雀文档",
    summary: [
      "📝 语雀文档链接已检测到",
      "",
      "无法自动抓取内容（可能是私有文档或网络限制）。",
      "",
      "💡 你可以：",
      "  1. 在设置中配置语雀 API Token 来自动读取私有文档",
      "  2. 在输入框中补充描述文档的主要内容，AI 将据此规划学习路径",
    ].join("\n"),
    tags: ["语雀"],
  };
}

// ─── 飞书文档 ─────────────────────────────────────────────────────────────

/**
 * 从飞书 URL 解析文档 token
 * 支持：
 *   https://xxx.feishu.cn/docx/<doc_token>
 *   https://xxx.feishu.cn/wiki/<space_id>/...
 *   https://feishu.cn/docs/<doc_token>
 */
function parseFeishuUrl(url: string): { type: "docx" | "wiki" | "doc"; token: string } | null {
  const docxM = url.match(/feishu\.cn\/docx\/([A-Za-z0-9]+)/);
  if (docxM) return { type: "docx", token: docxM[1] };

  const wikiM = url.match(/feishu\.cn\/wiki\/([A-Za-z0-9]+)/);
  if (wikiM) return { type: "wiki", token: wikiM[1] };

  const docM = url.match(/feishu\.cn\/docs\/([A-Za-z0-9]+)/);
  if (docM) return { type: "doc", token: docM[1] };

  return null;
}

async function fetchFeishu(url: string): Promise<FetchedContent | null> {
  const userToken = process.env.FEISHU_USER_TOKEN;
  const parsed = parseFeishuUrl(url);

  // ── 有 Token → 调用 Open API ──────────────────────────────────────────
  if (userToken && parsed) {
    try {
      // 飞书文档内容 API
      const apiUrl = parsed.type === "docx"
        ? `https://open.feishu.cn/open-apis/docx/v1/documents/${parsed.token}/raw_content`
        : `https://open.feishu.cn/open-apis/doc/v2/${parsed.token}/content`;

      const res = await fetch(apiUrl, {
        headers: {
          "Authorization": `Bearer ${userToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (res.ok) {
        const json = await res.json() as { code: number; data?: { content?: string; raw_content?: string } };
        if (json.code === 0 && json.data) {
          const rawContent = json.data.raw_content ?? json.data.content ?? "";
          const bodyText = rawContent
            .replace(/\\n/g, "\n")
            .replace(/\s{2,}/g, " ")
            .trim()
            .slice(0, 2000);

          // 获取文档标题
          let docTitle = "飞书文档";
          try {
            const metaRes = await fetch(
              `https://open.feishu.cn/open-apis/docx/v1/documents/${parsed.token}`,
              { headers: { "Authorization": `Bearer ${userToken}` }, signal: AbortSignal.timeout(4000) }
            );
            if (metaRes.ok) {
              const meta = await metaRes.json() as { data?: { document?: { title?: string } } };
              docTitle = meta.data?.document?.title ?? docTitle;
            }
          } catch { /* ignore */ }

          return {
            url,
            urlType: "feishu",
            title: docTitle,
            summary: [
              `📋 飞书文档：${docTitle}`,
              "",
              "── 文档内容（节选）──",
              bodyText,
            ].join("\n").slice(0, 2500),
            tags: ["飞书"],
            rawPreview: bodyText.slice(0, 400),
          };
        }
      }
    } catch { /* 降级到公开抓取 */ }
  }

  // ── 无 Token → HTML 抓取 + 友好引导 ──────────────────────────────────
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (res.ok) {
      const html = await res.text();
      const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const rawTitle = titleM ? titleM[1].replace(/\s*-\s*飞书云文档.*$/, "").trim() : "";

      // og:title 通常更干净
      const ogM = html.match(/property="og:title"[^>]+content="([^"]+)"/i);
      const title = ogM ? ogM[1].trim() : rawTitle || "飞书文档";

      const isPrivate = html.includes("无权限") || html.includes("请登录") || html.length < 5000;

      const summary = isPrivate
        ? [
            `📋 飞书文档：${title}`,
            "",
            "🔒 此文档需要权限才能访问。",
            "",
            "💡 如需让 AI 读取飞书文档，请在设置中配置飞书 User Access Token：",
            "   设置 → 集成 → 飞书 → 填入 Token",
            "   （在飞书开放平台 → 个人访问凭证 获取）",
          ].join("\n")
        : `📋 飞书文档：${title}\n\n（文档内容需要登录查看，请在输入框补充文档的主要内容描述。）`;

      return {
        url,
        urlType: "feishu",
        title,
        summary,
        tags: ["飞书"],
      };
    }
  } catch { /* ignore */ }

  return {
    url,
    urlType: "feishu",
    title: "飞书文档",
    summary: [
      "📋 飞书文档链接已检测到",
      "",
      "无法自动抓取内容（私有文档或网络限制）。",
      "",
      "💡 你可以在设置中配置飞书 User Token，或在输入框中补充文档的主要内容。",
    ].join("\n"),
    tags: ["飞书"],
  };
}

// ─── 检测与主入口 ─────────────────────────────────────────────────────────

export type WorkspacePlatform = "yuque" | "feishu";

export function detectWorkspacePlatform(url: string): WorkspacePlatform | null {
  const u = url.toLowerCase();
  if (u.includes("yuque.com")) return "yuque";
  if (u.includes("feishu.cn") || u.includes("larkoffice.com") || u.includes("larksuite.com")) return "feishu";
  return null;
}

export async function fetchWorkspaceDoc(url: string, platform: WorkspacePlatform): Promise<FetchedContent | null> {
  if (platform === "yuque") return fetchYuque(url);
  return fetchFeishu(url);
}
