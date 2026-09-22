import type { SubtaskWithTask } from "@/lib/api/tasks";
import { BLOOM_CONFIG } from "@/lib/design-tokens";
import type { TimeFilter } from "./timeline-sections";

export type SubtaskLineState = "done" | "live" | "todo";
export const BLOOM_TAG_CLASS: Record<number, string> = { 1: "text-bloom-1 border-bloom-1", 2: "text-bloom-2 border-bloom-2", 3: "text-bloom-3 border-bloom-3", 4: "text-bloom-4 border-bloom-4", 5: "text-bloom-5 border-bloom-5", 6: "text-bloom-6 border-bloom-6" };
export function lineStateOf(row: SubtaskWithTask, section: TimeFilter): SubtaskLineState { return row.completed ? "done" : section === "today" ? "live" : "todo"; }
export function bloomOf(row: SubtaskWithTask) { const level = Math.min(6, Math.max(1, row.bloomLevel ?? (row.urgency ? 7 - row.urgency : 3))); return { level, config: BLOOM_CONFIG[level as keyof typeof BLOOM_CONFIG] ?? BLOOM_CONFIG[3] }; }
export function hoursOf(row: SubtaskWithTask): number { const deep = row.deepWorkHours ? Number(row.deepWorkHours) : 0; return deep > 0 ? deep : (row.durationDays || 1) * 1.5; }
