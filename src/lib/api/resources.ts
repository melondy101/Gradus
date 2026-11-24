import { apiFetch } from "@/lib/api/result";

/** 资源站内预览结果（FB-08） */
export interface ResourcePreview {
  ok: boolean;
  title?: string;
  summary?: string;
  tags?: string[];
  urlType?: string;
  error?: string;
}

/**
 * 抓取资源页面摘要用于站内预览。
 * 失败不抛异常 —— 预览是锦上添花，失败就退回到「打开原链接」。
 */
export async function fetchResourcePreview(url: string): Promise<ResourcePreview> {
  const res = await apiFetch<ResourcePreview>("/api/resources/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return { ok: false, error: res.message };
  return res.data;
}
