"use client";

import { useState, useRef, useCallback } from "react";
import { auth } from "@/lib/eazo-shim";
import { useRouter } from "next/navigation";
import { useEazo } from "@/lib/eazo-shim";
import { memory } from "@/lib/eazo-shim";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";
import { request } from "@/lib/api/request";
import { createTask } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";
import { AnalysisPanel } from "./analysis-panel";
import type { TaskPhase as FormPhase } from "./task-phase";

interface AnalysisState {
  phase: FormPhase;
  phaseLabel: string;
  subtasks: Subtask[];
  totalDays: number;
  taskId: string | null;
  deltaLen: number; // 已接收的 AI 生成字符数
  errorMsg: string;
}

const INITIAL_STATE: AnalysisState = {
  phase: "idle",
  phaseLabel: "",
  subtasks: [],
  totalDays: 0,
  taskId: null,
  deltaLen: 0,
  errorMsg: "",
};

const PHASE_LABELS: Record<FormPhase, string> = {
  idle: "",
  analyzing: "解析目标…",
  intent: "解析学习意图…",
  search: "匹配学习资源…",
  plan: "设计学习计划…",
  validate: "核查可执行性…",
  revise: "修订学习计划…",
  decomposing: "拆解学习计划…",
  scheduling: "安排学习排期…",
  saving: "写入数据库并排期…",
  done: "",
  error: "",
};

export function TaskInputForm() {
  const router = useRouter();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);

  const [goal, setGoal] = useState("");
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const isRunning = ["analyzing", "decomposing", "scheduling", "saving", "done"].includes(
    state.phase
  );

  const handleAnalyze = useCallback(async () => {
    if (!goal.trim() || isRunning) return;

    if (!user) {
      try {
        await auth.login();
      } catch {
        return;
      }
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      ...INITIAL_STATE,
      phase: "analyzing",
      phaseLabel: "解析目标…",
    });

    try {
      const task = await createTask(goal.trim());

      const res = await request(`/api/tasks/${task.id}/analyze`, {
        method: "POST",
        signal: controller.signal,
      });

      if (!res.ok) {
        const raw = await res.text();
        let friendly = raw;
        try {
          const body = JSON.parse(raw) as { error?: string; message?: string };
          friendly = body.error || body.message || raw;
        } catch { /* 非 JSON 原样展示 */ }
        throw new Error(friendly || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        result?: {
          taskName?: string;
          rawInput?: string;
          subtasks?: Subtask[];
          totalDays?: number;
        };
      };
      if (!json.ok || !json.result) {
        throw new Error("AI 分析未返回有效结果");
      }

      const finishedPhase: FormPhase = "saving";
      setState((prev) => ({
        ...prev,
        phase: finishedPhase,
        phaseLabel: PHASE_LABELS[finishedPhase],
        taskId: task.id,
      }));
      await new Promise((resolve) => setTimeout(resolve, 600));

      setState({
        phase: "done",
        phaseLabel: "",
        subtasks: json.result.subtasks ?? [],
        totalDays: json.result.totalDays ?? 0,
        taskId: task.id,
        deltaLen: 0,
        errorMsg: "",
      });
      memory
        .reportAction({
          content: `User analyzed goal: "${goal.trim()}" — ${(json.result.subtasks ?? []).length} subtasks generated`,
          event_type: "create",
        })
        .catch(() => {});
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      if (err instanceof AppAIClientUnavailableError) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[AutoTask] analyze exception:", msg);
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMsg: msg,
      }));
    }
  }, [goal, isRunning, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
    setGoal("");
  };

  if (loading) {
    return (
      <div className="flex items-center h-20">
        <span className="text-[14px]" style={{ color: "#777B75" }}>
          加载中…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Big headline textarea */}
      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="你想做什么？"
        disabled={isRunning}
        rows={2}
        aria-label="输入目标"
        className="w-full border-0 bg-transparent outline-none resize-none"
        style={{
          font: `600 clamp(42px,12vw,84px)/0.94 var(--font-geist), sans-serif`,
          letterSpacing: "-0.075em",
          color: "#111111",
        }}
      />

      {/* Inline analysis */}
      <AnalysisPanel
        phase={state.phase}
        phaseLabel={state.phaseLabel}
        subtasks={state.subtasks}
        totalDays={state.totalDays}
        goal={goal}
        deltaLen={state.deltaLen}
        errorMsg={state.errorMsg}
      />

      {/* CTA row */}
      <div className="flex flex-wrap gap-3 items-center">
        {state.phase === "done" ? (
          <>
            <button
              onClick={() => state.taskId && router.push(`/task/${state.taskId}`)}
              className="px-6 py-[10px] rounded-full text-[14px] font-medium text-white hover:opacity-90 transition-opacity"
              style={{ background: "#111111" }}
            >
              查看完整任务 →
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-[10px] rounded-full text-[14px] border hover:bg-white transition-colors"
              style={{ borderColor: "#E7E7E2", color: "#777B75" }}
            >
              重置
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleAnalyze}
              disabled={!goal.trim() || isRunning}
              className="px-6 py-[10px] rounded-full text-[14px] font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#111111" }}
            >
              {isRunning ? "分析中…" : "开始分析"}
            </button>
            {!user && (
              <button
                className="text-[13px] underline"
                style={{ color: "#3B7AFF" }}
                onClick={() => auth.login().catch(() => {})}
              >
                登录以保存历史
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}



