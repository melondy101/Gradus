import Link from "next/link";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/utils";

import { wrapClass } from "./band-wrap";
import { APP_URL, appViewUrl, REPO_URL } from "./links";

/**
 * 7 · 最终 CTA —— 《品牌与产品设计说明》§2.7
 * 奶油底居中 64px 大标题（黄色句号）+ 副文 + 三按钮 + 部署脚注。
 */
export function LandingFinalCta() {
  return (
    <section
      className={cn(
        wrapClass,
        "py-20 text-center min-[680px]:py-[128px]"
      )}
    >
      <Eyebrow>Start today</Eyebrow>
      <Heading
        level={2}
        spec="hero"
        accentDot
        className="mx-auto mt-4 max-w-[800px]"
      >
        今天想学点什么
      </Heading>
      <p className="mx-auto mt-[22px] max-w-[560px] text-[16px] leading-[27px] text-text-2">
        把你的目标丢给拾级，三十秒后你会拿到一张带资源、带排期的甘特图。
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
        <Link href={APP_URL} className={buttonVariants({ variant: "default" })}>
          免费开始规划
        </Link>
        <Link href={appViewUrl("plans")} className={buttonVariants({ variant: "outline" })}>
          先看演示数据
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          自托管部署
        </a>
      </div>

      <p className="mt-7 font-mono text-caption tracking-[.03em] text-text-3">
        部署前请配置数据库、认证密钥与 AI 服务；完整清单见 .env.example。
      </p>
    </section>
  );
}
