import type { Metadata } from "next";

import { LandingPage } from "@/components/landing";

export const metadata: Metadata = {
  title: {
    absolute: "拾级 Gradus · 从一个模糊的目标到每天清楚要走哪一级",
  },
  description:
    "拾级（Gradus）是面向自主学习者的 AI 学习任务规划器：把模糊目标拆成带排期、带真实资源、带 Bloom 认知层级递进的子任务，自动核查修订并全局接续排期。开源、支持 BYOK、可自托管。",
  keywords: [
    "AI 学习规划",
    "任务拆解",
    "甘特图",
    "Bloom 认知层级",
    "间隔复习",
    "自托管",
    "开源",
  ],
};

/** 站点根路径 = 品牌落地页；产品应用见 /app（src/app/app/page.tsx） */
export default function LandingRoute() {
  return <LandingPage />;
}
