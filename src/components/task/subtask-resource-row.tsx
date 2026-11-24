"use client";

import { ExternalLink } from "lucide-react";

import { ResourcePreviewPanel } from "@/components/home/resource-preview-panel";
import { openResource, type ResourceView } from "./subtask-resource-view";

interface SubtaskResourceRowProps {
  res: ResourceView;
}

/**
 * 详情面板内的一条学习资源：标题 + 来源与可信度标注 + 站内预览。
 * 可信度两档沿用设计语言 —— VERIFIED（白名单检索到的真实链接，黄底）
 * 与 SEARCH ONLY（仅搜索词，点击跳转搜索引擎自选，描边底）。
 *
 * FB-08：点标题先在站内预览（摘要 + 标签），「打开原链接」降为次级动作；
 * FB-05：链接活着但课程已结课时给出警示。
 */
export function SubtaskResourceRow({ res }: SubtaskResourceRowProps) {
  const unlearnable = res.contentStatus === "ended" || res.contentStatus === "closed";
  return (
    <div className="mb-2 rounded-field border border-bd-card bg-cream-light px-[14px] py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-body leading-[20px] font-bold">{res.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 font-mono text-2xs font-medium tracking-[.05em] text-text-3">
            {res.verified ? (
              <i className="rounded-chip-sm bg-[rgba(245,197,24,.2)] px-[6px] py-0.5 font-bold not-italic text-accent-ink">
                VERIFIED
              </i>
            ) : (
              <i className="rounded-chip-sm border border-bd-field bg-cream px-[6px] py-0.5 font-bold not-italic text-text-2">
                SEARCH ONLY
              </i>
            )}
            {unlearnable && (
              <i className="rounded-chip-sm bg-error-soft px-[6px] py-0.5 font-bold not-italic text-error">
                已结束 · 不可学
              </i>
            )}
            {res.source}
            {res.authority !== null ? ` · 权威 ${(res.authority / 10).toFixed(1)}` : ""}
            {res.dead ? " · 链接不可访问" : ""}
          </span>
          {unlearnable && (
            <p className="mt-1 text-body-sm text-error">
              链接能打开，但课程已结课或内容已下架，建议换一个资源。
            </p>
          )}
        </div>
        {res.clickable && (
          <button
            type="button"
            onClick={() => openResource(res)}
            title="在新标签页打开原链接"
            className="inline-flex flex-none items-center gap-1 text-body-sm font-bold text-ink underline decoration-bd-check underline-offset-4 transition-colors hover:decoration-ink"
          >
            打开 <ExternalLink size={11} />
          </button>
        )}
      </div>

      {res.url && <ResourcePreviewPanel url={res.url} title={res.title} className="mt-2" />}
    </div>
  );
}
