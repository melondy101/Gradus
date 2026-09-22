"use client";

/**
 * AI 规划流水线的前端状态机（《品牌与产品设计说明》§3 屏三 / AGENTS.md §8）。
 *
 * ⚠ 数据契约：analyze 路由一次请求串行跑完 4+ 段流水线后返回缓冲 JSON
 * `{ ok, result: { subtasks, totalDays, taskName, rawInput, startDate, topicCategory, … } }`，
 * 客户端拿不到增量信号，因此用 PHASE_TIMELINE 本地重建「Agent 体验」。
 * 本文件只做状态推进，不改任何请求/响应形状。
 */

import { useState, useRef, useCallback } from "react";
import { request } from "@/lib/api/request";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";
import { createTask, getTask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";
import type { TrustableResource } from "@/lib/tavily";
import { memory, auth } from "@/lib/eazo-shim";

// Resource 与 TrustableResource 对齐，保留 export 供外部兼容引用
export type Resource = TrustableResource;

export type Phase =
  | "idle"
  | "intent"
  | "search"
  | "plan"
  | "validate"
  | "revise"
  | "saving"
  | "done"
  | "error";

export interface StreamState {
  phase: Phase;
  label: string;
  deltaLen: number;
  errorMsg: string;
  startedAt?: number;
}

const INIT_STREAM: StreamState = { phase: "idle", label: "", deltaLen: 0, errorMsg: "" };

export interface AnalysisEntry {
  taskId: string;
  taskTitle: string;
  rawInput: string;
  topicCategory?: string;
  stream: StreamState;
  task: TaskWithSubtasks | null;
}

// ── 四阶段流水线（§3 屏三：意图解析 → 资源检索 → 计划生成 → 核查修订）──────
export interface PipelineStage {
  key: string;
  /** 该阶段起始的 stream.phase */
  phase: Phase;
  label: string;
  /** 阶段副标题（.pnode .mono） */
  hint: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { key: "intent", phase: "intent", label: "意图解析", hint: "INTENT" },
  { key: "search", phase: "search", label: "资源检索", hint: "TAVILY" },
  { key: "plan", phase: "plan", label: "计划生成", hint: "PLAN" },
  { key: "validate", phase: "validate", label: "核查修订", hint: "VALIDATE" },
];

export const PHASE_ORDER: Phase[] = [
  "idle",
  "intent",
  "search",
  "plan",
  "validate",
  "revise",
  "saving",
  "done",
];

/** stream.phase → 四阶段中的第几阶段（0 基）；done 表示全部完成 */
export function stageIndexOf(phase: Phase): number {
  if (phase === "done") return PIPELINE_STAGES.length;
  if (phase === "idle" || phase === "error") return -1;
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx <= 0) return 0;
  // validate / revise / saving 同属「核查修订」
  return Math.min(idx - 1, PIPELINE_STAGES.length - 1);
}

export function isRunningPhase(phase: Phase): boolean {
  return phase !== "idle" && phase !== "done" && phase !== "error";
}

// Client-side phase labels used by the ticker while we await the buffered
// (non-streaming) analyze response.
const PHASE_LABELS: Record<string, string> = {
  intent: "解析学习意图…",
  search: "匹配学习资源…",
  plan: "设计学习计划…",
  validate: "核查可执行性…",
  saving: "写入数据库并排期…",
};

// Cumulative second at which each phase begins. Calibrated against our
// optimized pipeline (~35-45s end to end); the last phase is sticky, so a slower
// model just holds on "saving" while the elapsed counter keeps ticking.
const PHASE_TIMELINE: Array<[startSec: number, phase: Phase]> = [
  [0, "intent"],
  [6, "search"],
  [14, "plan"],
  [30, "validate"],
  [42, "saving"],
];

function phaseForElapsed(elapsedSec: number): Phase {
  let current: Phase = "intent";
  for (const [startSec, phase] of PHASE_TIMELINE) {
    if (elapsedSec >= startSec) current = phase;
  }
  return current;
}

// 分析每阶段「约还需 XX 秒」倒计时徽章
// TalkTask 用缓冲式 ticker 推进 phase，deltaLen 即已用秒数；
// 结合 PHASE_TIMELINE 推算当前阶段剩余时间。
export function getEtaLabel(phase: Phase, elapsedSec: number): string | null {
  if (phase === "done" || phase === "idle" || phase === "error") return null;
  const idx = PHASE_TIMELINE.findIndex(([, p]) => p === phase);
  if (idx < 0) return null;
  const startSec = PHASE_TIMELINE[idx][0];
  const endSec = idx + 1 < PHASE_TIMELINE.length ? PHASE_TIMELINE[idx + 1][0] : startSec + 15;
  const remaining = endSec - elapsedSec;
  return remaining <= 2 ? "即将完成…" : `约还需 ${Math.round(remaining)} 秒`;
}

export function useAnalysisPanel() {
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runStream = useCallback(async (taskId: string, goal: string, adjustment: string, isNew: boolean) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const patchStream = (s: Partial<StreamState>) =>
      setEntries((prev) => prev.map((e) => e.taskId === taskId ? { ...e, stream: { ...e.stream, ...s } } : e));

    patchStream({ phase: "intent", label: PHASE_LABELS.intent, deltaLen: 0, errorMsg: "", startedAt: Date.now() });

    // The analyze route buffers its whole 4-stage LLM pipeline into one JSON
    // response, so the client gets no incremental signal. This ticker
    // reconstructs the "Agent 体验" locally: it advances the phase on a
    // timeline calibrated to how long each stage actually takes, and keeps a
    // live elapsed counter so a 90s run never looks frozen.
    const startedAt = Date.now();
    const ticker = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const phase = phaseForElapsed(elapsedSec);
      setEntries((prev) => prev.map((e) => e.taskId === taskId
        ? { ...e, stream: { ...e.stream, phase, label: PHASE_LABELS[phase], deltaLen: elapsedSec } }
        : e));
    }, 1000);

    try {
      const res = await request(`/api/tasks/${taskId}/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjustment ? { adjustment } : {}), signal: ctrl.signal,
      });
      if (!res.ok) {
        // 解析后端 JSON 错误体，给出可读的中文提示，而不是把整段 JSON 暴露给用户。
        const raw = (await res.text()) || "";
        let friendly = raw;
        try {
          const body = JSON.parse(raw) as { error?: string; message?: string };
          friendly = body.error || body.message || raw;
        } catch { /* 非 JSON 则原样展示 */ }
        throw new Error(friendly || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        debug?: string;
        result?: {
          taskName?: string;
          rawInput?: string;
          subtasks?: Subtask[];
          totalDays?: number;
          startDate?: string;
          topicCategory?: string;
        };
      };
      if (!json.ok || !json.result) {
        throw new Error(json.error || "AI 分析未返回有效结果，请稍后重试");
      }

      clearInterval(ticker);
      patchStream({ phase: "done" });
      // 匿名访客首次创建任务后，middleware 已兜底建临时账号并下发 cookie，
      // 但客户端 user 态不会自动刷新。这里主动刷新，让 header / 左栏立即
      // 反映临时账号并展示刚创建的任务。（已登录用户刷新无害）
      auth.refresh().catch(() => {});
      let full = await getTask(taskId).catch(() => null);
      if ((!full || !full.subtasks || full.subtasks.length === 0) && json.result.subtasks && json.result.subtasks.length > 0) {
        // 兜底补全：若后端或网络查询有极小延迟，直接用 analyze 返回的子任务数据水化任务对象
        full = {
          id: taskId,
          userId: "",
          title: json.result.taskName || goal,
          rawInput: json.result.rawInput || goal,
          totalDays: json.result.totalDays || 1,
          status: "done",
          startDate: json.result.startDate ? new Date(json.result.startDate) : new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          subtasks: json.result.subtasks,
        } as TaskWithSubtasks;
      }
      setEntries((prev) => prev.map((e) => e.taskId === taskId
        ? { ...e, task: full, taskTitle: json.result!.taskName || e.taskTitle, rawInput: json.result!.rawInput || e.rawInput }
        : e));
      if (isNew) memory.reportAction({ content: `Goal analyzed: "${goal}"`, event_type: "create" }).catch(() => {});
    } catch (err) {
      clearInterval(ticker);
      if ((err as Error).name === "AbortError") return;
      if (err instanceof AppAIClientUnavailableError) return;
      patchStream({ phase: "error", errorMsg: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const startAnalysis = useCallback(async (goal: string, tags: string[] = []) => {
    if (!goal.trim()) return;
    abortRef.current?.abort();
    const tempId = `temp-${Date.now()}`;
    try {
      const task = await createTask(goal.trim(), tags);
      setEntries((prev) => [{ taskId: task.id, taskTitle: goal.trim(), rawInput: goal.trim(), stream: INIT_STREAM, task: null }, ...prev]);
      setFocusedId(task.id);
      await runStream(task.id, goal.trim(), "", true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setEntries((prev) => [
        {
          taskId: tempId,
          taskTitle: goal.trim(),
          rawInput: goal.trim(),
          stream: { phase: "error", label: "创建失败", deltaLen: 0, errorMsg },
          task: null,
        },
        ...prev,
      ]);
      setFocusedId(tempId);
    }
  }, [runStream]);

  const regenAnalysis = useCallback((taskId: string, adjustment: string) => {
    abortRef.current?.abort();
    setEntries((prev) => {
      const entry = prev.find((e) => e.taskId === taskId);
      if (entry) { runStream(taskId, entry.rawInput, adjustment, false); }
      return prev.map((e) => e.taskId === taskId ? { ...e, task: null, stream: INIT_STREAM } : e);
    });
    setFocusedId(taskId);
  }, [runStream]);

  const removeEntry = useCallback((taskId: string) => {
    setEntries((prev) => prev.filter((e) => e.taskId !== taskId));
    setFocusedId((prev) => prev === taskId ? null : prev);
  }, []);

  /** 持久化 hydration：从 DB 加载历史任务，合并去重 */
  const hydrateFromDB = useCallback((dbTasks: TaskWithSubtasks[]) => {
    setEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.taskId));
      const newEntries: AnalysisEntry[] = dbTasks
        .filter((t) => !existingIds.has(t.id) && t.subtasks.length > 0)
        .map((t) => ({
          taskId: t.id,
          taskTitle: t.title,
          rawInput: t.rawInput || t.title,
          topicCategory: (t.subtasks[0] as unknown as { topic?: string })?.topic ?? undefined,
          stream: { phase: "done" as Phase, label: "", deltaLen: 0, errorMsg: "" },
          task: t,
        }));
      if (newEntries.length === 0) return prev;
      return [...prev, ...newEntries];
    });
  }, []);

  /** 聚焦某个任务并切换到它 */
  const focusTask = useCallback((taskId: string) => {
    setFocusedId(taskId);
  }, []);

  /** 同步右侧 AI 面板的子任务完成态 */
  const patchSubtaskCompleted = useCallback((taskId: string, subtaskId: string, completed: boolean) => {
    setEntries((prev) => prev.map((e) => {
      if (e.taskId !== taskId || !e.task) return e;
      return {
        ...e,
        task: {
          ...e.task,
          subtasks: e.task.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed } : s),
        },
      };
    }));
  }, []);

  return {
    entries,
    focusedId,
    setFocusedId,
    startAnalysis,
    regenAnalysis,
    removeEntry,
    hydrateFromDB,
    focusTask,
    patchSubtaskCompleted,
  };
}
