import Link from "next/link";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { buttonVariants } from "@/components/ui/button";

import { Band } from "./band";
import { BandWrap } from "./band-wrap";
import { APP_URL, appViewUrl, DEPLOY_URL } from "./links";

/**
 * 7 · 最终 CTA —— 《品牌与产品设计说明》§2.7
 * 浅奶油带 + 居中 64px 大标题（朱红强调）+ 副文 + 三按钮。
 * 标题不再用旧品牌的黄色句点：时间色谱的强调色是朱红，与应用内四个视图一致。
 */
export function LandingFinalCta() {
  return (
    <Band id="sec-cta" tone="light">
      <BandWrap>
        <div className="text-center">
          <Eyebrow>Start today</Eyebrow>
          <Heading
            level={2}
            spec="hero"
            className="mx-auto mt-4 max-w-[800px]"
          >
            今天<span className="text-error">想学点什么</span>
          </Heading>
          <p className="mx-auto mt-[22px] max-w-[560px] font-chromatic text-[16px] leading-[27px] text-text-2">
            把你的目标丢给拾级，一两分钟后你会拿到一张带资源、带排期的甘特图。
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <Link href={APP_URL} className={buttonVariants({ variant: "default" })}>
              免费开始 · 试用 3 次
            </Link>
            <Link href={appViewUrl("plans")} className={buttonVariants({ variant: "outline" })}>
              先看演示数据
            </Link>
            <a
              href={DEPLOY_URL}
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
        </div>
      </BandWrap>
    </Band>
  );
}
