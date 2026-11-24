import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";

/**
 * 配额与价格（FB-03）
 *
 * 之前落地页通篇不提配额，用户进会员中心才发现「可用 AI 规划次数 0 次」，
 * 第一次点「按意见重排」就撞墙。现在把额度、价格与自托管口径写在明面上。
 *
 * 价格与 src/lib/commerce/catalog.ts 的 COMMERCE_PRODUCTS 对齐：
 * 10 次包 ¥9.90 / 30 次包 ¥24.90（专业版权益仍在适配，不可购买）。
 */
const FREE_TIERS = [
  { label: "试用", value: "3 次完整规划", note: "含重排 / 重新生成，生成失败不扣次" },
  { label: "每日刷新", value: "每天 1 次", note: "试用额度用完后每天赠送，东八区 00:00 重置" },
  { label: "同时进行", value: "2 个学习任务", note: "今日新建 + 删除合计 10 次" },
] as const;

const PAID_PACKS = [
  { name: "AI 规划 10 次包", price: "¥9.90", note: "10 次规划额度，180 天内有效，可叠加" },
  { name: "AI 规划 30 次包", price: "¥24.90", note: "30 次规划额度，180 天内有效，可叠加" },
] as const;

export function LandingQuotaBand() {
  return (
    <Band id="sec-quota" tone="light">
      <BandWrap>
        <Eyebrow>Quota &amp; Pricing</Eyebrow>
        <Heading level={2} spec="sec" className={bandHeadingClass}>
          先把额度说清楚，再让你开始
        </Heading>
        <p className="mb-9 max-w-[68ch] font-chromatic text-[16px] leading-[27px] text-text-2">
          免费账号能完整跑一遍「目标 → 拆解 → 排期 → 天梯 → 打卡」的全流程。
          额度用完不会拦死你：第二天还会再送一次，也可以在会员中心买次数包。
        </p>

        <div className="grid grid-cols-1 gap-5 min-[680px]:grid-cols-3">
          {FREE_TIERS.map((tier) => (
            <div key={tier.label} className="border border-bd-card bg-white p-6">
              <Eyebrow kind="label" className="mb-2">
                {tier.label}
              </Eyebrow>
              <p className="font-chromatic text-[28px] leading-[1.15] font-bold text-ink">
                {tier.value}
              </p>
              <p className="mt-2 text-[14px] leading-[22px] text-text-2">{tier.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 min-[680px]:grid-cols-2">
          {PAID_PACKS.map((pack) => (
            <div key={pack.name} className="flex items-baseline justify-between gap-4 border border-bd-card bg-white p-6">
              <div>
                <p className="text-body font-bold text-ink">{pack.name}</p>
                <p className="mt-1 text-[14px] leading-[22px] text-text-2">{pack.note}</p>
              </div>
              <p className="font-chromatic text-[26px] leading-none font-bold text-ink">{pack.price}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-caption tracking-[.03em] text-text-3">
          自托管部署不限次数：用你自己的模型与数据库，配置见 .env.example 与部署文档。
        </p>
      </BandWrap>
    </Band>
  );
}
