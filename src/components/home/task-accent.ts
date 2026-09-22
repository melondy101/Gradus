// ─── 计划主题 → 品牌强调色（§1.2 暖灰阶梯 + 点缀黄）───────────────────────
// 时间轴卡片用左侧 3.5px 竖条标识「这条子任务属于哪个计划」。原实现返回 CSS 变量
// 字符串再塞进内联 style，且回退值是品牌外的紫/蓝/粉；这里改为返回静态 Tailwind
// 令牌类，主题不在白名单时按 taskId 哈希到一个 6 色环形调色板。

import type { TimeFilter } from "./timeline-sections";

/** 文字/描边共用的一组 Bloom 令牌类（与 BLOOM_CONFIG 的 1→6 顺序一致） */
export const BLOOM_TEXT_CLASS: Record<number, string> = {
  1: "text-bloom-1",
  2: "text-bloom-2",
  3: "text-bloom-3",
  4: "text-bloom-4",
  5: "text-bloom-5",
  6: "text-bloom-6",
};

export const BLOOM_BORDER_CLASS: Record<number, string> = {
  1: "border-bloom-1",
  2: "border-bloom-2",
  3: "border-bloom-3",
  4: "border-bloom-4",
  5: "border-bloom-5",
  6: "border-bloom-6",
};

export const BLOOM_BG_CLASS: Record<number, string> = {
  1: "bg-bloom-1",
  2: "bg-bloom-2",
  3: "bg-bloom-3",
  4: "bg-bloom-4",
  5: "bg-bloom-5",
  6: "bg-bloom-6",
};

/** 达成台阶：从该层令牌色渐隐到白卡底（§1.2 暖灰阶梯 → 顶点黄） */
export const BLOOM_STEP_GRADIENT: Record<number, string> = {
  1: "bg-[linear-gradient(180deg,var(--bloom-1),var(--card))]",
  2: "bg-[linear-gradient(180deg,var(--bloom-2),var(--card))]",
  3: "bg-[linear-gradient(180deg,var(--bloom-3),var(--card))]",
  4: "bg-[linear-gradient(180deg,var(--bloom-4),var(--card))]",
  5: "bg-[linear-gradient(180deg,var(--bloom-5),var(--card))]",
  6: "bg-[linear-gradient(180deg,var(--bloom-6),var(--card))]",
};

const TOPIC_ACCENT: Record<string, string> = {
  编程: "border-l-accent-deep",
  数学: "border-l-bloom-4",
  语言: "border-l-accent",
  科学: "border-l-bloom-3",
  艺术: "border-l-bloom-6",
  商业: "border-l-bloom-5",
  历史: "border-l-bloom-2",
  健身: "border-l-success",
  其他: "border-l-bd-check",
};

/** 6 色环形调色板：全部取自动态令牌，不引入品牌外色相 */
const PALETTE = [
  "border-l-accent",
  "border-l-accent-deep",
  "border-l-bloom-3",
  "border-l-bloom-4",
  "border-l-bloom-5",
  "border-l-bd-check",
];

export function taskAccentClass(taskId: string, topic?: string | null): string {
  if (topic && TOPIC_ACCENT[topic]) return TOPIC_ACCENT[topic];
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/** 时间桶竖条（与 timeline-sections 的 SECTION_ACCENT_CLASS 同源） */
export function sectionBarClass(tone: TimeFilter): string {
  return {
    today: "bg-accent",
    tomorrow: "bg-accent-deep",
    week: "bg-bloom-4",
    later: "bg-bd-check",
    all: "bg-ink",
  }[tone];
}
