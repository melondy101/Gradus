"use client";

/**
 * AI 卡里的单条推荐资源（原 app.css `.sug` 深色行）。
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
    <li className="border-t border-bd-dark py-2">
      <button
        type="button"
        onClick={() => open(res)}
        disabled={!clickable}
        className="w-full cursor-pointer bg-transparent text-left text-[14px] font-bold text-on-dark hover:text-accent disabled:cursor-default disabled:hover:text-on-dark"
      >
        {res.title}
      </button>
      <p className="mt-[5px] flex flex-wrap items-center gap-2 text-body leading-[20px] text-on-dark-2">
        <AiTrustTag res={res} />
        {res.platform && <span className="font-mono text-caption tracking-[.05em]">{res.platform}</span>}
        {res.author && <span className="font-mono text-caption tracking-[.05em]">{res.author}</span>}
      </p>
    </li>
  );
}
