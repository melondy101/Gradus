"use client";

/**
 * 资源可信度标注（§4.4：真实检索链路才有「已校验」；搜索入口如实标注）。
 * 数据来源：resolveResources + validateResources 写入 resources JSON 的字段。
 *
 * 形态取 §3 屏二 `.res__m i`：等宽 9.5px / 700 / .05em / 4px 圆角小牌，
 * 这里按深底（AI 卡）反推三态：失效=error 半透明、已校验=点缀黄、其余=白雾。
 */

import { cn } from "@/utils/utils";
import type { Resource } from "./use-analysis-panel";

export function AiTrustTag({ res }: { res: Resource }) {
  const meta = res as unknown as { trust_level?: string; url_status?: string };
  const dead = meta.url_status === "not_found" || meta.url_status === "dead";
  const verified = meta.trust_level ? meta.trust_level === "verified" : !!res.url;
  const label = dead ? "链接失效" : verified ? "已校验" : "搜索入口";

  return (
    <span
      className={cn(
        "rounded-[4px] px-[6px] py-[2px] font-mono text-[9.5px] leading-[1.4] font-bold tracking-[.05em] whitespace-nowrap",
        dead && "bg-error/[.28] text-error",
        !dead && verified && "bg-accent/[.18] text-accent",
        !dead && !verified && "bg-on-dark/[.08] text-on-dark-2"
      )}
    >
      {label}
    </span>
  );
}
