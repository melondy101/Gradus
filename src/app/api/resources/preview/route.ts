import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { isSafePublicUrl } from "@/lib/ssrf-guard";
import { fetchUrlContent } from "@/lib/url-fetcher";

/**
 * 资源站内预览（FB-08）
 *
 * 之前点子任务里的资源只会弹一个新标签页跳走（慕课 / MOOC / 论文），
 * 用户没法在产品里先看一眼这条资源讲的是什么。
 *
 * 这里做一次**只读**抓取，返回标题 / 摘要 / 标签：
 *   · 不消耗 AI 额度、不写库、不做任何副作用
 *   · SSRF 防护：只允许公网 http(s)
 *   · 抓不到就返回 ok:false，不阻断界面
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const limited = enforceRateLimit(`resources:preview:${auth.user.id}`, 30, 60_000);
  if (limited) return limited;

  const body = await request.json().catch(() => null) as { url?: unknown } | null;
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json({ ok: false, error: "缺少资源地址" }, { status: 400 });
  }
  if (!isSafePublicUrl(url)) {
    return NextResponse.json({ ok: false, error: "该地址不允许抓取" }, { status: 400 });
  }

  try {
    const content = await fetchUrlContent(url);
    if (!content) {
      return NextResponse.json({ ok: false, error: "这个页面暂时抓不到内容" }, { status: 200 });
    }
    return NextResponse.json({
      ok: true,
      title: content.title,
      summary: content.summary.slice(0, 1200),
      tags: content.tags.slice(0, 8),
      urlType: content.urlType,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "这个页面暂时抓不到内容" }, { status: 200 });
  }
}
