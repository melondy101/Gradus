import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";
import { PrivacyCard } from "./privacy-card";

type PrivacyEntry = {
  key: string;
  title: string;
  body: ReactNode;
};

const CARDS: readonly PrivacyEntry[] = [
  {
    key: "byok",
    title: "BYOK",
    body: (
      <>
        自带模型密钥。<code>AI_PROVIDER_API_KEY</code>{" "}
        在你自己的环境变量里，我们不代持、不经转售。
      </>
    ),
  },
  {
    key: "self-host",
    title: "自托管",
    body: (
      <>
        已从平台解耦，<code>package.json</code>{" "}
        里没有任何厂商 SDK。配好数据库与模型端点即可上线。
      </>
    ),
  },
  {
    key: "export",
    title: "数据可导出",
    body: <>任务、子任务、排期都是你自己库里的表结构，Drizzle schema 就是契约。</>,
  },
  {
    key: "no-tracking",
    title: "无行为追踪",
    body: (
      <>
        不做学习行为画像，不埋营销事件。Analytics 只有一个页面计数，可关。
      </>
    ),
  },
];

/**
 * 6 · 隐私（深色带）—— 《品牌与产品设计说明》§2.6
 * 黄色眉题 + 反白标题（深色带上限宽 620px）+ 四张描边暗卡。
 * 1180px 以下两列、680px 以下单列。
 */
export function LandingPrivacyBand() {
  return (
    <Band id="sec-privacy" tone="dark">
      <BandWrap>
        <Eyebrow tone="accent">Privacy &amp; Ownership</Eyebrow>
        <Heading
          level={2}
          spec="sec"
          accentDot
          className={`${bandHeadingClass} max-w-[620px]`}
        >
          你的学习数据，
          <br />
          只属于你和你的服务器
        </Heading>
        <div className="grid grid-cols-1 gap-[18px] min-[680px]:grid-cols-2 min-[1180px]:grid-cols-[repeat(4,minmax(0,1fr))]">
          {CARDS.map((card) => (
            <PrivacyCard key={card.key} title={card.title} body={card.body} />
          ))}
        </div>
      </BandWrap>
    </Band>
  );
}
