import type { SubtaskWithTask } from "@/lib/api/tasks";
import { BLOOM_CONFIG } from "@/lib/design-tokens";
import type { TimeFilter } from "./timeline-sections";

export type SubtaskLineState = "done" | "live" | "todo";
export const BLOOM_TAG_CLASS: Record<number, string> = { 1: "text-bloom-1 border-bloom-1", 2: "text-bloom-2 border-bloom-2", 3: "text-bloom-3 border-bloom-3", 4: "text-bloom-4 border-bloom-4", 5: "text-bloom-5 border-bloom-5", 6: "text-bloom-6 border-bloom-6" };
export function lineStateOf(row: SubtaskWithTask, section: TimeFilter): SubtaskLineState { return row.completed ? "done" : section === "today" ? "live" : "todo"; }

/**
 * 认知层级判定：全仓唯一真源（FB-01）
 *
 * ⚠️ 旧版 bug：先读 `urgency` 再读 `bloomLevel`。`urgency` 是**任务级共享分数**
 * （同一任务的全部子任务拿到同一个值），于是今日面板把六个子任务全标成「L3 应用」，
 * 与详情页 / 天梯图自相矛盾。`urgency` 永远不能当层级用。
 *
 * 现在：`bloomLevel`（AI 逐子任务写下的认知层级）是唯一依据；
 * 缺失时 `known = false`，UI 显示「层级未标注」而不是假装一个层级。
 * `level` 仍给出一个兜底值，仅用于取色与排布，不再对外宣称。
 */
export function bloomOf(row: SubtaskWithTask) {
  const raw = Number(row.bloomLevel);
  const known = Number.isFinite(raw) && raw >= 1 && raw <= 6;
  const fallback = row.urgency ? 7 - row.urgency : 3;
  const level = Math.min(6, Math.max(1, known ? raw : fallback));
  return { level, known, config: BLOOM_CONFIG[level as keyof typeof BLOOM_CONFIG] ?? BLOOM_CONFIG[3] };
}
