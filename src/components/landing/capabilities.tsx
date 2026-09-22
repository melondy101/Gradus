import {
  CalendarRange,
  ChartGantt,
  RefreshCw,
  ScanSearch,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";
import { CapabilityCard } from "./capability-card";

type Capability = {
  icon: LucideIcon;
  title: string;
  body: string;
};

/** 设计稿用 ◈ ◉ ▤ ◫ ↻ ▲ 等字符图形；这里换成同尺寸的 lucide 线性图标，避免缺字 */
const CAPABILITIES: readonly Capability[] = [
  {
    icon: Target,
    title: "AI 目标拆解",
    body: "把「学好日语」拆成可执行、可验收的子任务，每个带时长、优先级与认知层级。",
  },
  {
    icon: ScanSearch,
    title: "资源检索与校验",
    body: "AI 只产出搜索意图，真实链接由白名单检索得到，并做存活 / 权威 / 新鲜度三维校验。",
  },
  {
    icon: CalendarRange,
    title: "全局接续排期",
    body: "新任务永远排在未完成任务之后，每日槽位限制主题扎堆，认知负荷保持均衡。",
  },
  {
    icon: ChartGantt,
    title: "甘特图与进度看板",
    body: "灰=已完成、黄=进行中、描边=计划中，一屏看清整条学习路径的现在时。",
  },
  {
    icon: RefreshCw,
    title: "自动核查修订",
    body: "计划不是生成完就完了。核查段打分并给出建议，不达标自动重排一版。",
  },
  {
    icon: TrendingUp,
    title: "Bloom 难度递进",
    body: "从记忆、理解到分析、评价，按认知层级排序子任务，避免一上来就啃硬骨头。",
  },
];

/**
 * 5 · 核心能力 —— 《品牌与产品设计说明》§2.5
 * 显式 2 行 × 3 列白卡网格；1180px 以下两列、680px 以下单列。
 */
export function LandingCapabilities() {
  return (
    <Band id="sec-cap">
      <BandWrap>
        <Eyebrow>Core Capabilities</Eyebrow>
        <Heading level={2} spec="sec" className={bandHeadingClass}>
          六件事，它做得比通用待办更认真
        </Heading>
        <div className="grid grid-cols-1 gap-5 min-[680px]:grid-cols-2 min-[1180px]:grid-cols-[repeat(3,minmax(0,1fr))]">
          {CAPABILITIES.map((item) => (
            <CapabilityCard key={item.title} {...item} />
          ))}
        </div>
      </BandWrap>
    </Band>
  );
}
