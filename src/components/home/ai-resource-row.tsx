"use client";

/**
 * AI 面板里的推荐资源（原 app.css `.sug` 深色行 → 暖纸底行）。
 * 标题即入口：verified 打开真实 URL，search_only 跳搜索引擎 —— 与 §10 两阶段检索口径一致，
 * 绝不展示 AI 编造的链接（链接只可能来自 resolveResources）。
 */

import { openExternalUrl } from "@/lib/safe-url";
import { AiTrustTag } from "./ai-trust-tag";
import type { Resource } from "./use-analysis-panel";

function open(r: Resource) {
  if (r.url) openExternalUrl(r.url);
  else if (r.searchQuery) {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(r.searchQuery)}`, "_blank", "noopener");
  }
}

export function AiResourceRow({ res }: { res: Resource }) {
  const clickable = !!(res.url || res.searchQuery);
  return (
    <li className="border-t border-bd-card py-2">
      <button
        type="button"
        onClick={() => open(res)}
        disabled={!clickable}
        className="w-full cursor-pointer bg-transparent text-left text-body-lg font-bold text-ink hover:text-error disabled:cursor-default disabled:hover:text-ink"
      >
        {res.title}
      </button>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-body leading-[20px] text-text-2">
        <AiTrustTag res={res} />
        {res.platform && <span className="font-mono text-caption tracking-[.05em]">{res.platform}</span>}
        {res.author && <span className="font-mono text-caption tracking-[.05em]">{res.author}</span>}
      </p>
    </li>
  );
}
