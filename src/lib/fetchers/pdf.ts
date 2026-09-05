/**
 * PDF 直链抓取
 *
 * 策略：
 *   1. HEAD 请求确认 Content-Type 是 PDF
 *   2. 下载前 64 KB（够覆盖元数据 + 第一页文本）
 *   3. 从 PDF 二进制中提取：
 *      - /Title  /Author  /Subject  /Keywords  /Creator
 *      - 所有可读 ASCII 文本流（BT...ET 块，即页面文字内容）
 *   4. 拼接成结构化摘要注入 Prompt
 *
 * 不依赖任何第三方库，纯字节操作。
 */

import type { FetchedContent } from "../url-fetcher";

const TIMEOUT = 15000;
const MAX_BYTES = 256 * 1024; // 256 KB，足够抓前 3~5 页

// ─── PDF 元数据提取 ────────────────────────────────────────────────────────

interface PdfMeta {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  pageCount: number;
}

/** 解码 PDF 字符串：处理 UTF-16BE BOM 和八进制转义 */
function decodePdfString(raw: string): string {
  // 去掉括号
  const s = raw.replace(/^\(|\)$/g, "");

  // UTF-16BE: 以 \xFE\xFF 开头
  if (s.startsWith("\xFE\xFF") || s.startsWith("þÿ")) {
    // 每两个字节合成一个 Unicode 码点
    const bytes: number[] = [];
    for (let i = 0; i < s.length; i++) bytes.push(s.charCodeAt(i));
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out.replace(/\x00/g, "").trim();
  }

  // 八进制转义 \nnn
  return s
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, " ")
    .replace(/\\r/g, " ")
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractPdfMeta(text: string): PdfMeta {
  const get = (key: string): string => {
    // 匹配 /Key (value) 或 /Key <hex>
    const reParens = new RegExp(`/${key}\\s*\\(([^)]{0,300})\\)`, "i");
    const m = text.match(reParens);
    if (m) return decodePdfString(`(${m[1]})`);
    return "";
  };

  // 页数：/Count N
  const countM = text.match(/\/Count\s+(\d+)/);
  const pageCount = countM ? parseInt(countM[1]) : 0;

  return {
    title:    get("Title"),
    author:   get("Author"),
    subject:  get("Subject"),
    keywords: get("Keywords"),
    creator:  get("Creator"),
    pageCount,
  };
}

// ─── PDF 文本流提取 ────────────────────────────────────────────────────────

/** 从 PDF BT...ET 块中提取可读字符串 */
function extractPdfTextStreams(binary: string): string {
  const chunks: string[] = [];

  // 找所有 BT...ET 文本块
  const btEtRe = /BT([\s\S]{0,2000}?)ET/g;
  let m: RegExpExecArray | null;

  while ((m = btEtRe.exec(binary)) !== null && chunks.length < 200) {
    const block = m[1];

    // 提取括号字符串 (text) 和 <hex> 字符串
    // 括号字符串
    const parenRe = /\(([^)]{1,200})\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = parenRe.exec(block)) !== null) {
      const decoded = decodePdfString(`(${pm[1]})`);
      if (decoded && decoded.trim().length > 1 && isPrintable(decoded)) {
        chunks.push(decoded);
      }
    }

    // Hex 字符串 <4e6f...>
    const hexRe = /<([0-9a-fA-F]{4,})>/g;
    let hm: RegExpExecArray | null;
    while ((hm = hexRe.exec(block)) !== null) {
      try {
        const hex = hm[1];
        let str = "";
        // UTF-16BE 两字节一字符
        for (let i = 0; i + 3 < hex.length; i += 4) {
          const cp = parseInt(hex.slice(i, i + 4), 16);
          if (cp > 0x20 && cp < 0xFFFE) str += String.fromCodePoint(cp);
        }
        if (str.trim().length > 1) chunks.push(str);
      } catch { /* ignore */ }
    }
  }

  // 合并，去重相邻重复
  const words = chunks
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return words.slice(0, 3000);
}

function isPrintable(s: string): boolean {
  // 至少 30% 是可打印 ASCII 或中文字符
  let printable = 0;
  for (const c of s) {
    const cp = c.charCodeAt(0);
    if ((cp >= 0x20 && cp < 0x7F) || (cp >= 0x4E00 && cp <= 0x9FFF)) printable++;
  }
  return printable / s.length > 0.3;
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

/** 从 URL 末尾判断是否是 PDF 直链 */
export function isPdfUrl(url: string): boolean {
  const u = url.toLowerCase().split("?")[0];
  return u.endsWith(".pdf");
}

export async function fetchPdf(url: string): Promise<FetchedContent | null> {
  try {
    // 1. HEAD 检查 Content-Type
    const head = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "AutoTask/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    const ct = head.headers.get("content-type") ?? "";
    if (!ct.includes("pdf") && !isPdfUrl(url)) return null;

    // 2. 下载前 MAX_BYTES
    const res = await fetch(url, {
      headers: {
        "User-Agent": "AutoTask/1.0",
        "Range": `bytes=0-${MAX_BYTES - 1}`,
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok && res.status !== 206) return null;

    const buffer = await res.arrayBuffer();
    // 转成 Latin-1 字符串（保留字节值，方便正则匹配）
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < Math.min(bytes.length, MAX_BYTES); i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // 3. 提取元数据
    const meta = extractPdfMeta(binary);

    // 4. 提取文本流
    const textContent = extractPdfTextStreams(binary);

    // 5. 从 URL 猜标题（如果 meta 里没有）
    const urlFilename = url.split("/").pop()?.replace(/\.pdf$/i, "").replace(/[-_]/g, " ") ?? "";
    const title = meta.title || urlFilename || "PDF 文档";

    // 6. 构建摘要
    const lines: string[] = [];
    lines.push(`📄 PDF：${title}`);
    if (meta.author)   lines.push(`👤 作者：${meta.author}`);
    if (meta.subject)  lines.push(`📌 主题：${meta.subject}`);
    if (meta.keywords) lines.push(`🏷 关键词：${meta.keywords}`);
    if (meta.pageCount > 0) lines.push(`📃 页数：${meta.pageCount} 页`);
    if (meta.creator)  lines.push(`🛠 制作工具：${meta.creator}`);

    if (textContent.trim().length > 50) {
      lines.push("", "── 文档内容（节选）──", textContent.slice(0, 1800));
    } else {
      lines.push("", "（PDF 内容为扫描图片或加密，无法提取文字。请补充描述文档主要内容。）");
    }

    const tags = [
      "PDF",
      ...(meta.keywords ? meta.keywords.split(/[,;，；\s]+/).filter(Boolean).slice(0, 5) : []),
    ];

    return {
      url,
      urlType: "pdf",
      title,
      summary: lines.join("\n").slice(0, 2500),
      tags,
      rawPreview: textContent.slice(0, 400),
    };
  } catch {
    return null;
  }
}
