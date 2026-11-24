"use client";

/**
 * 资源可信度标注（§4.4：真实检索链路才有「已校验」；搜索入口如实标注）。
 * 数据来源：resolveResources + validateResources 写入 resources JSON 的字段。
 *
 * 形态取 §3 屏二 `.res__m i`：等宽 9.5px / 700 / .05em / 4px 圆角小牌，
 * 暖纸底三态：失效 = 朱红半透明、已校验 = 点缀黄（深金墨字）、其余 = 暖灰。
 */

import { cn } from "@/utils/utils";
import type { Resource } from "./use-analysis-panel";

export function AiTrustTag({ res }: { res: Resource }) {
  const meta = res as unknown as {
    trust_level?: string;
    url_status?: string;
    content_status?: string;
    status_evidence?: string;
  };
  const dead = meta.url_status === "not_found" || meta.url_status === "dead";
  // FB-05：链接活着但课已结 / 已下架 —— 不能再标「已校验」
  const unlearnable = meta.content_status === "ended" || meta.content_status === "closed";
  const verified = meta.trust_level ? meta.trust_level === "verified" : !!res.url;
  const label = dead
    ? "链接失效"
    : unlearnable
      ? "已结束 · 不可学"
      : verified
        ? "已校验"
        : "搜索入口";
  const title = unlearnable
    ? meta.status_evidence
      ? `链接可打开，但内容已不可学习：${meta.status_evidence}`
      : "链接可打开，但内容已不可学习（课程已结课或资源已下架）"
    : verified && meta.content_status === "unknown"
      ? "已校验：确认链接可访问（未确认内容是否仍在开课）"
      : undefined;

  return (
    <span
      title={title}
      className={cn(
        "rounded-chip-sm px-1.5 py-0.5 font-mono text-2xs leading-[1.4] font-bold tracking-[.05em] whitespace-nowrap",
        (dead || unlearnable) && "bg-error-soft text-error",
        !dead && !unlearnable && verified && "bg-accent-soft text-accent-ink",
        !dead && !unlearnable && !verified && "bg-bd-card text-text-2"
      )}
    >
      {label}
    </span>
  );
}
