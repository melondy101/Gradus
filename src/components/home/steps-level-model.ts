import { BLOOM_CONFIG } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { bloomOf } from "./subtask-line-model";

export const BLOOM_LEVELS = [1, 2, 3, 4, 5, 6] as const;

/** 每一阶对应的学习动作（天梯左栏的说明文案，与台阶名同源） */
export const LEVEL_COPY: Record<number, string> = {
  1: "记住事实、术语与基本定义，是后面每一阶的落点。",
  2: "用自己的话解释概念，把它和已经会的东西连起来。",
  3: "把知识用到新情境里，完成具体练习与操作。",
  4: "拆开结构、比较差异，找出因果与证据。",
  5: "按标准做判断，说清理由，发现站不住的地方。",
  6: "整合已有知识，产出自己的方案、作品或结论。",
};

export type BloomLevelGroup = {
  level: number;
  config: (typeof BLOOM_CONFIG)[keyof typeof BLOOM_CONFIG];
  items: SubtaskWithTask[];
  completedCount: number;
  totalCount: number;
  pct: number;
};

/**
 * 按 Bloom 层级（1→6）分组，供天梯视图的台阶全览与筛选复用。
 *
 * 分组层级必须与卡片标签用同一个判定（bloomOf），否则会出现
 * 「台阶显示 L1、卡片标签显示 L3」的自相矛盾（FB-01）。
 * 未标注认知层级（bloomLevel 缺失）的子任务不进任何台阶，只在全阶清单里出现。
 */
export function levelGroupsOf(subtasks: SubtaskWithTask[]): BloomLevelGroup[] {
  return BLOOM_LEVELS.map((lvl) => {
    const config = BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG];
    const items = subtasks.filter((s) => bloomOf(s).known && bloomOf(s).level === lvl);
    const completedCount = items.filter((s) => s.completed).length;
    return {
      level: lvl,
      config,
      items,
      completedCount,
      totalCount: items.length,
      pct: items.length > 0 ? completedCount / items.length : 0,
    };
  });
}
