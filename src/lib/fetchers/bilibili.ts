/**
 * Bilibili 视频信息增强
 *
 * 通过 Bilibili 公开 API 获取真实视频信息（无需登录）：
 *   - 视频标题、简介、时长
 *   - UP 主名称
 *   - 播放量、点赞、投币
 *   - 标签/分区
 *
 * 支持的链接格式：
 *   - https://www.bilibili.com/video/BV1xx411c7mD
 *   - https://www.bilibili.com/video/av170001
 *   - https://b23.tv/xxxxx  （短链，先 HEAD 解析重定向）
 */

import type { FetchedContent } from "../url-fetcher";

const TIMEOUT = 8000;

// ─── ID 提取 ──────────────────────────────────────────────────────────────

interface VideoId {
  type: "bvid" | "avid";
  value: string;
}

async function resolveVideoId(url: string): Promise<VideoId | null> {
  let resolved = url;

  // b23.tv 短链 → 先 HEAD 追踪重定向
  if (url.includes("b23.tv")) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(6000),
      });
      resolved = res.url || url;
    } catch {
      return null;
    }
  }

  // BV 号
  const bvM = resolved.match(/\/video\/(BV[0-9A-Za-z]+)/i);
  if (bvM) return { type: "bvid", value: bvM[1] };

  // av 号
  const avM = resolved.match(/\/video\/av(\d+)/i);
  if (avM) return { type: "avid", value: avM[1] };

  // URL 参数中的 bvid/aid
  const params = new URL(resolved.startsWith("http") ? resolved : `https://x.com${resolved}`).searchParams;
  const bvParam = params.get("bvid");
  if (bvParam) return { type: "bvid", value: bvParam };
  const avParam = params.get("aid");
  if (avParam) return { type: "avid", value: avParam };

  return null;
}

// ─── Bilibili API 结构 ────────────────────────────────────────────────────

interface BiliVideoData {
  code: number;
  message: string;
  data: {
    bvid: string;
    aid: number;
    title: string;
    desc: string;
    duration: number;         // 秒
    pic: string;
    owner: {
      name: string;
      mid: number;
    };
    stat: {
      view: number;
      like: number;
      coin: number;
      favorite: number;
      share: number;
      danmaku: number;
    };
    tname: string;            // 分区名
    tags?: Array<{ tag_name: string }>;
  };
}

interface BiliTagData {
  code: number;
  data: Array<{ tag_name: string }>;
}

/** 秒数转 mm:ss 或 hh:mm:ss */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}

// ─── 主入口 ───────────────────────────────────────────────────────────────

export async function fetchBilibili(url: string): Promise<FetchedContent | null> {
  const videoId = await resolveVideoId(url);
  if (!videoId) return null;

  try {
    // 1. 视频基本信息
    const apiUrl = videoId.type === "bvid"
      ? `https://api.bilibili.com/x/web-interface/view?bvid=${videoId.value}`
      : `https://api.bilibili.com/x/web-interface/view?aid=${videoId.value}`;

    const res = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AutoTask/1.0)",
        "Referer": "https://www.bilibili.com/",
      },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return null;

    const json = await res.json() as BiliVideoData;
    if (json.code !== 0 || !json.data) return null;

    const v = json.data;

    // 2. 视频标签（可选，单独接口）
    let tagNames: string[] = [];
    try {
      const tagRes = await fetch(
        `https://api.bilibili.com/x/tag/archive/tags?bvid=${v.bvid}`,
        {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoTask/1.0)", "Referer": "https://www.bilibili.com/" },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (tagRes.ok) {
        const tagJson = await tagRes.json() as BiliTagData;
        if (tagJson.code === 0 && Array.isArray(tagJson.data)) {
          tagNames = tagJson.data.slice(0, 8).map(t => t.tag_name);
        }
      }
    } catch { /* 标签接口失败不影响主流程 */ }

    // 3. 构建摘要
    const lines: string[] = [];
    lines.push(`📺 Bilibili：${v.title}`);
    lines.push(`👤 UP主：${v.owner.name}`);
    lines.push(`🗂 分区：${v.tname}`);
    lines.push(`⏱ 时长：${formatDuration(v.duration)}`);
    lines.push(`👁 播放：${formatCount(v.stat.view)}  👍 点赞：${formatCount(v.stat.like)}  💰 投币：${formatCount(v.stat.coin)}`);

    if (tagNames.length > 0) {
      lines.push(`🏷 标签：${tagNames.join(" · ")}`);
    }

    if (v.desc && v.desc.trim() && v.desc !== "-") {
      lines.push("", "── 视频简介 ──", v.desc.trim().slice(0, 800));
    }

    lines.push(
      "",
      "⚠ 注意：视频字幕/弹幕无法自动抓取。",
      "如果视频有特定章节或知识点，建议在任务描述里补充说明，AI 会据此规划更精准的学习路径。"
    );

    const tags = [
      "Bilibili",
      v.tname,
      v.owner.name,
      ...tagNames.slice(0, 4),
    ].filter(Boolean);

    return {
      url,
      urlType: "bilibili",
      title: v.title,
      summary: lines.join("\n").slice(0, 2500),
      tags,
      rawPreview: v.desc?.slice(0, 300) ?? "",
    };
  } catch {
    return null;
  }
}
