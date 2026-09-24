import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";
import { FeedItem } from "./feed-item";
import { GithubCard } from "./github-card";

const FEED = [
  {
    date: "2026.09.18",
    title: "全局接续排期",
    body: "新目标不再挤压旧计划，自动从最末结束日 + 1 接续，超过 7 天空档则回退到今天。",
  },
  {
    date: "2026.09.11",
    title: "资源三维可信度校验",
    body: "URL 存活、域名权威分、新鲜度并行校验，AI 不再凭空编造链接。",
  },
  {
    date: "2026.09.03",
    title: "自动核查修订",
    body: "计划生成后跑一遍 VALIDATE，Bloom 层级跳跃或评分不足时自动重排。",
  },
] as const;

/**
 * 3 · What's New —— 《品牌与产品设计说明》§2.3
 * 左侧更新列表（版心 1fr 列，顶边一条细描边分隔行）+ 右侧 400px 深色开源卡。
 */
export function LandingWhatsNew() {
  return (
    <Band id="sec-whatsnew">
      <BandWrap layout="split">
        <div>
          <Eyebrow>What&apos;s New</Eyebrow>
          <Heading level={2} spec="sec" className={bandHeadingClass}>
            最近更新了什么
          </Heading>
          <ul className="border-t border-bd-card">
            {FEED.map((item) => (
              <FeedItem key={item.date} {...item} />
            ))}
          </ul>
        </div>

        <GithubCard />
      </BandWrap>
    </Band>
  );
}
