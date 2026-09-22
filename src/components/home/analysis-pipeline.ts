import type { Phase } from "./analysis-types";

export interface PipelineStage { key: string; phase: Phase; label: string; hint: string; }
export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "intent", phase: "intent", label: "意图解析", hint: "INTENT" },
  { key: "search", phase: "search", label: "资源检索", hint: "TAVILY" },
  { key: "plan", phase: "plan", label: "计划生成", hint: "PLAN" },
  { key: "validate", phase: "validate", label: "核查修订", hint: "VALIDATE" },
];
const timeline: Array<[number, Phase]> = [[0, "intent"], [6, "search"], [14, "plan"], [30, "validate"], [42, "saving"]];
export const PHASE_LABELS: Record<string, string> = { intent: "解析学习意图…", search: "匹配学习资源…", plan: "设计学习计划…", validate: "核查可执行性…", saving: "写入数据库并排期…" };
export function phaseForElapsed(seconds: number): Phase { return timeline.reduce<Phase>((current, [start, phase]) => seconds >= start ? phase : current, "intent"); }
export function stageIndexOf(phase: Phase): number { if (phase === "done") return 4; if (phase === "idle" || phase === "error") return -1; return Math.min(["idle", "intent", "search", "plan", "validate", "revise", "saving", "done"].indexOf(phase) - 1, 3); }
export function isRunningPhase(phase: Phase): boolean { return !["idle", "done", "error"].includes(phase); }
export function getEtaLabel(phase: Phase, elapsed: number): string | null { const i = timeline.findIndex(([, p]) => p === phase); if (i < 0) return null; const end = i + 1 < timeline.length ? timeline[i + 1][0] : timeline[i][0] + 15; return end - elapsed <= 2 ? "即将完成…" : `约还需 ${Math.round(end - elapsed)} 秒`; }
