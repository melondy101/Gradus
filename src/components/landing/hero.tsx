import { Diamond } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { cn } from "@/utils/utils";

import { wrapClass } from "./band-wrap";
import { HeroAiStatus } from "./hero-ai-status";
import { HeroMock } from "./mock";
import { APP_URL } from "./links";

/**
 * 2 · Hero —— 《品牌与产品设计说明》§2.2
 * 左文（更新徽章 / 图标标语行 / 三行 64px 大标题 + 黄句号 / 说明文 / 三按钮 / 脚注）
 * 右图（产品界面 mockup 白卡，卡内在四个视图间循环 + 悬浮 AI 状态 pill 循环四阶段）。
 * 1180px 以下两列堆叠、视觉稿收成 560px 上限。
 */
export function LandingHero() {
  return (
    <section className={cn(wrapClass, "pt-[88px] pb-[108px]")}>
      <div className="grid grid-cols-1 items-center gap-14 min-[1180px]:grid-cols-[560px_1fr] min-[1180px]:gap-16">
        <div>
          <Badge
            state="plan"
            className="self-auto gap-[9px] border-bd-card bg-white pt-[7px] pr-[15px] pb-[7px] pl-3 text-[11px] font-normal tracking-[.04em]"
          >
            <span
              aria-hidden
              className="size-[7px] shrink-0 animate-pulse rounded-full bg-accent [animation-duration:1.8s]"
            />
            v2.4 · 全局接续排期已上线
          </Badge>

          <p className="mt-[26px] flex items-center gap-[9px] text-[13px] tracking-[.02em] text-text-2">
            <Diamond size={14} aria-hidden className="shrink-0 text-accent" />
            面向自主学习者的 AI 学习任务规划器
          </p>

          <Heading level={1} spec="hero" accentDot className="mt-3.5">
            从一个模糊的目标
            <br />
            到每天清楚要走
            <br />
            哪一级
          </Heading>

          <p className="mt-[22px] max-w-[520px] text-[16px] leading-[27px] text-text-2">
            说出你想学什么。拾级把它拆成带排期、带真实资源、带认知层级递进的子任务，自动核查并修订计划，然后在你迈上每一级之后，把后面的日程悄悄接上。
          </p>

          <div className="mt-[34px] flex flex-wrap items-center gap-3.5">
            <Link href={APP_URL} className={buttonVariants({ variant: "default" })}>
              开始规划我的目标
            </Link>
            <a href="#sec-how" className={buttonVariants({ variant: "outline" })}>
              看看它怎么工作
            </a>
            <a
              href="#sec-cap"
              className="group inline-flex items-center gap-[7px] px-1 py-2 text-[14.5px] font-bold text-ink"
            >
              了解 Bloom 递进设计
              <span className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>

          <p className="mt-[26px] font-mono text-[11px] tracking-[.03em] text-text-3">
            无需信用卡 · BYOK 接入你自己的模型 · 数据留在你自己的库里
          </p>
        </div>

        <div className="relative pb-[26px] min-[1180px]:max-w-[560px]">
          <HeroMock />
          <HeroAiStatus />
        </div>
      </div>
    </section>
  );
}
