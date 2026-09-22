import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";
import { StepCard } from "./step-card";

const STEPS = [
  {
    no: "STEP 01",
    title: "说出目标",
    body: "一句模糊的话，或一门课、一本书、一篇论文的链接。",
  },
  {
    no: "STEP 02",
    title: "AI 拆解",
    body: "意图解析 → 资源检索 → 计划生成，产出 4～8 个子任务。",
  },
  {
    no: "STEP 03",
    title: "核查修订",
    body: "校验 Bloom 递进是否合理、资源是否真实可达，不合格就重排。",
  },
  {
    no: "STEP 04",
    title: "每天接着走",
    body: "完成一级，后面的日程自动接续，复习节点按时提醒。",
  },
] as const;

/**
 * 4 · How it works —— 《品牌与产品设计说明》§2.4
 * 浅奶油交替带 + 四步流程白卡；1180px 以下两列、卡间箭头收起，680px 以下单列。
 */
export function LandingHowItWorks() {
  return (
    <Band id="sec-how" tone="light">
      <BandWrap>
        <Eyebrow>How it works</Eyebrow>
        <Heading level={2} spec="sec" className={bandHeadingClass}>
          四步，从一句话到一张甘特图
        </Heading>
        <div className="grid grid-cols-1 gap-5 min-[680px]:grid-cols-2 min-[1180px]:grid-cols-4">
          {STEPS.map((step) => (
            <StepCard key={step.no} {...step} />
          ))}
        </div>
      </BandWrap>
    </Band>
  );
}
