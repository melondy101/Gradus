import { BLOOM_CONFIG } from "@/lib/design-tokens";
import type { SubtaskWithTask } from "@/lib/api/tasks";

export const BLOOM_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export type BloomLevelGroup = {
  level: number;
  config: (typeof BLOOM_CONFIG)[keyof typeof BLOOM_CONFIG];
  items: SubtaskWithTask[];
  completedCount: number;
  totalCount: number;
  pct: number;
};

/** 按 Bloom 层级（1→6）分组，供天梯视图的台阶全览与筛选复用 */
export function levelGroupsOf(subtasks: SubtaskWithTask[]): BloomLevelGroup[] {
  return BLOOM_LEVELS.map((lvl) => {
    const config = BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG];
    const items = subtasks.filter((s) => (s.bloomLevel || 1) === lvl);
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
