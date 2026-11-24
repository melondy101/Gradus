"use client";

/**
 * 资源站内预览（FB-08）
 *
 * 之前点资源只会弹新标签页跳走；这里让用户先在产品里看一眼这条资源讲什么，
 * 再决定要不要跳出去。预览是只读的：不消耗额度、不写库，抓不到就退回原链接。
 */

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import { fetchResourcePreview, type ResourcePreview } from "@/lib/api/resources";
import { openExternalUrl } from "@/lib/safe-url";
import { cn } from "@/utils/utils";

interface Props {
  url: string | null;
  /** 资源标题，作为预览无标题时的兜底 */
  title: string;
  className?: string;
}

export function ResourcePreviewPanel({ url, title, className }: Props) {
  const [preview, setPreview] = useState<ResourcePreview | null>(null);
  const [loading, setLoading] = useState(false);

  if (!url) return null;

  const load = async () => {
    setLoading(true);
    try {
      setPreview(await fetchResourcePreview(url));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("border border-bd-card bg-cream-light px-3 py-2.5", className)}>
      {preview === null && !loading && (
        <button
          type="button"
          onClick={load}
          className="text-body-sm font-bold text-ink underline decoration-bd-check underline-offset-4 transition-colors hover:decoration-ink"
        >
          在站内预览这条资源
        </button>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-body-sm text-text-2">
          <Loader2 size={12} className="animate-spin" />
          正在抓取页面内容…
        </p>
      )}

      {preview && !preview.ok && (
        <p className="text-body-sm text-text-2">
          {preview.error ?? "这个页面暂时抓不到内容"}
          <button
            type="button"
            onClick={() => openExternalUrl(url)}
            className="ml-2 inline-flex items-center gap-1 font-bold text-ink underline decoration-bd-check underline-offset-4"
          >
            直接打开原链接 <ExternalLink size={11} />
          </button>
        </p>
      )}

      {preview?.ok && (
        <div className="flex flex-col gap-1.5">
          <p className="text-body font-bold text-ink">{preview.title || title}</p>
          {preview.tags && preview.tags.length > 0 && (
            <p className="font-mono text-2xs tracking-[.05em] text-text-3">
              {preview.tags.join(" · ")}
            </p>
          )}
          <p className="line-clamp-6 text-body-sm leading-[21px] text-text-2">{preview.summary}</p>
          <button
            type="button"
            onClick={() => openExternalUrl(url)}
            className="inline-flex w-fit items-center gap-1 text-body-sm font-bold text-ink underline decoration-bd-check underline-offset-4 transition-colors hover:decoration-ink"
          >
            打开原链接 <ExternalLink size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
