// ─── Bloom 六级台阶统计（微缩阶梯与阶梯面板共用）────────────────────────
// 纯函数：把「子任务的层级数组 + 完成数组」折算成 6 个台阶各自的
// 总数 / 完成数 / 是否达成，供 <BloomStaircase> 与 <BloomStaircasePanel> 渲染。
// 不编造数值：没有子任务的台阶 hasTasks=false，视觉上退到描边/透明。

import { BLOOM_CONFIG } from "@/lib/design-tokens";

export interface BloomStep {
  level: number;
  total: number;
  done: number;
  hasTasks: boolean;
  isComplete: boolean;
  ratio: number;
  config: (typeof BLOOM_CONFIG)[keyof typeof BLOOM_CONFIG];
}

export function computeBloomSteps(levels: number[], completed: boolean[]): BloomStep[] {
  return [1, 2, 3, 4, 5, 6].map((lvl) => {
    let total = 0;
    let done = 0;
    levels.forEach((l, idx) => {
      if (l === lvl) {
        total++;
        if (completed[idx]) done++;
      }
    });
    return {
      level: lvl,
      total,
      done,
      hasTasks: total > 0,
      isComplete: total > 0 && done === total,
      ratio: total > 0 ? done / total : 0,
      config: BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG],
    };
  });
}
