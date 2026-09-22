"use client";

import { openResource, type ResourceView } from "./subtask-resource-view";

interface SubtaskResourceRowProps {
  res: ResourceView;
}

/**
 * 详情面板内的一条学习资源：标题 + 来源与可信度标注。
 * 可信度两档沿用设计语言 —— VERIFIED（白名单检索到的真实链接，黄底）
 * 与 SEARCH ONLY（仅搜索词，点击跳转搜索引擎自选，描边底）。
 */
export function SubtaskResourceRow({ res }: SubtaskResourceRowProps) {
  return (
    <button
      type="button"
      disabled={!res.clickable}
      onClick={() => openResource(res)}
      title={res.url ?? res.searchQuery ?? res.title}
      className="mb-2 flex flex-col gap-1.5 rounded-field border border-bd-card bg-cream-light px-[14px] py-3 text-left transition-[border-color,transform] duration-[.16s] ease-out enabled:hover:translate-x-[3px] enabled:hover:border-ink disabled:cursor-default"
    >
      <span className="text-[13.5px] leading-[20px] font-bold">{res.title}</span>
      <span className="flex items-center gap-2 font-mono text-[9.5px] font-medium tracking-[.05em] text-text-3">
        {res.verified ? (
          <i className="rounded-[4px] bg-[rgba(245,197,24,.2)] px-[6px] py-0.5 font-bold not-italic text-accent-ink">
            VERIFIED
          </i>
        ) : (
          <i className="rounded-[4px] border border-bd-field bg-cream px-[6px] py-0.5 font-bold not-italic text-text-2">
            SEARCH ONLY
          </i>
        )}
        {res.source}
        {res.authority !== null ? ` · 权威 ${(res.authority / 10).toFixed(1)}` : ""}
        {res.dead ? " · 链接不可访问" : ""}
      </span>
    </button>
  );
}
