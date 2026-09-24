/**
 * 屏三 · AI 规划流水线的阶段模型（纯派生，不取数）。
 * 四个节点与设计稿一致：意图解析 → 资源检索 → 计划生成 → 核查修订。
 * 状态完全由 home-page 传入的 `phase` 推导（idle/intent/search/plan/validate/revise/saving/done/error）。
 */

export interface RitualStage {
  key: string;
  /** `.pnode b` 短标题 */
  name: string;
  /** `.pnode .mono` 眉题 */
  eyebrow: string;
  /** `.preview li .mono` 与 `.stage-card__desc` 说明 */
  desc: string;
}

export const RITUAL_STAGES: RitualStage[] = [
  {
    key: "intent",
    name: "意图解析",
    eyebrow: "STAGE 1",
    desc: "从目标原文里解析主题类别、紧急度与先备知识层级，锚定本次规划的 Bloom 认知终点与检索关键词。",
  },
  {
    key: "search",
    name: "资源检索",
    eyebrow: "STAGE 2",
    desc: "模型只给出搜索意图，真实链接由白名单检索补齐，并做 URL 存活、域名权威分、内容新鲜度三维校验。",
  },
  {
    key: "plan",
    name: "计划生成",
    eyebrow: "STAGE 3",
    desc: "依据意图与已校验资源拆出 4~8 个子任务，按认知层级渐进排序，并为每一条寻找可用的日期槽位。",
  },
  {
    key: "validate",
    name: "核查修订",
    eyebrow: "STAGE 4",
    desc: "核查认知跳跃与可执行性，必要时重排整份计划。",
  },
];

export const RITUAL_TIPS: string[] = [
  "布鲁姆认知分类法：从识记（L1）到创造（L6），学习留存率随层级抬升而显著提高。",
  "维果茨基最近发展区：先锚定你的先备知识边界，避免目标难度过大引发挫败感。",
  "两阶段检索：模型不直接产出 URL，所有链接都经过白名单检索与权威性打分，杜绝幻觉来源。",
  "每日交错槽位：排期算法会交错不同认知难度的子任务，防止高负荷任务连续扎堆。",
  "费曼学习法：在评价与创造阶段引导你产出公开笔记与可交付作品，形成认知闭环。",
];

/** 当前阶段索引：0~3；phase 为 done 时返回 4（全部完成）。 */
export function stageIndexOf(phase: string): number {
  if (phase === "done") return 4;
  if (phase === "search") return 1;
  if (phase === "plan") return 2;
  if (phase === "validate" || phase === "revise" || phase === "saving") return 3;
  return 0;
}

export type NodeState = "done" | "live" | "todo";

/** 单个节点的三态：已完成 / 进行中 / 待办。 */
export function nodeState(index: number, phase: string): NodeState {
  const active = stageIndexOf(phase);
  if (index < active) return "done";
  if (index === active) return "live";
  return "todo";
}

/** 连接线的三态（第 i 条线连着第 i 与第 i+1 个节点）。 */
export function lineState(index: number, phase: string): NodeState {
  const left = nodeState(index, phase);
  const right = nodeState(index + 1, phase);
  if (right === "done") return "done";
  if (left === "done" && right === "live") return "live";
  return "todo";
}

/**
 * 阶段内进度：沿用组件原有的估算模型（以 65 秒为总时长归一化），
 * 未收到真实百分比前不谎报完成。
 */
export const RITUAL_TOTAL_SEC = 65;

export function progressPct(phase: string, elapsedSec: number): number {
  if (phase === "done") return 100;
  const ratio = Math.max(0, elapsedSec) / RITUAL_TOTAL_SEC;
  return Math.min(96, Math.max(8, Math.round(ratio * 90) + 6));
}
