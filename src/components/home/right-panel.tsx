"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { request } from "@/lib/api/request";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";
import { createTask, getTask } from "@/lib/api/tasks";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";
import type { TrustableResource } from "@/lib/tavily";
import { memory, auth } from "@/lib/eazo-shim";
import { openExternalUrl } from "@/lib/safe-url";

// ── 响应式：窄屏（<=640px）判定 ─────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isMobile;
}

import { T } from "@/lib/design-tokens";

// Resource 与 TrustableResource 对齐，保留 export 供外部兼容引用
export type Resource = TrustableResource;

type Phase = "idle"|"intent"|"search"|"plan"|"validate"|"revise"|"saving"|"done"|"error";
interface StreamState { phase: Phase; label: string; deltaLen: number; errorMsg: string; startedAt?: number; }
const INIT_STREAM: StreamState = { phase: "idle", label: "", deltaLen: 0, errorMsg: "" };

// 分析每阶段「约还需 XX 秒」倒计时徽章
// TalkTask 用缓冲式 ticker 推进 phase，deltaLen 即已用秒数；
// 结合 PHASE_TIMELINE 推算当前阶段剩余时间（区别于 MyTask 流式 startedAt 模型）。
function getEtaLabel(phase: Phase, elapsedSec: number): string | null {
  if (phase === "done" || phase === "idle" || phase === "error") return null;
  const idx = PHASE_TIMELINE.findIndex(([, p]) => p === phase);
  if (idx < 0) return null;
  const startSec = PHASE_TIMELINE[idx][0];
  const endSec = idx + 1 < PHASE_TIMELINE.length ? PHASE_TIMELINE[idx + 1][0] : startSec + 15;
  const remaining = endSec - elapsedSec;
  return remaining <= 2 ? "即将完成…" : `约还需 ${Math.round(remaining)} 秒`;
}

const PIPELINE_STEPS: Array<{ key: Phase; label: string; icon: string }> = [
  { key: "intent",   label: "解析学习意图", icon: "🧠" },
  { key: "search",   label: "搜索学习资源", icon: "🔍" },
  { key: "plan",     label: "制定学习计划", icon: "📋" },
  { key: "validate", label: "核查可执行性", icon: "✅" },
  { key: "done",     label: "完成",         icon: "🎉" },
];
const PHASE_ORDER: Phase[] = ["idle","intent","search","plan","validate","revise","saving","done"];

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

export interface AnalysisEntry {
  taskId: string;
  taskTitle: string;
  rawInput: string;
  topicCategory?: string;
  stream: StreamState;
  task: TaskWithSubtasks | null;
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

  const startAnalysis = useCallback(async (goal: string) => {
    if (!goal.trim()) return;
    abortRef.current?.abort();
    const tempId = `temp-${Date.now()}`;
    try {
      const task = await createTask(goal.trim());
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

  return { entries, focusedId, setFocusedId, startAnalysis, regenAnalysis, removeEntry, hydrateFromDB, focusTask, patchSubtaskCompleted };
}

// ─── Pipeline Steps Display ───────────────────────────────────────────

function PipelineSteps({ stream }: { stream: StreamState }) {
  const curIdx = PHASE_ORDER.indexOf(stream.phase);
  const isError = stream.phase === "error";
  const [, tick] = useState(0);
  useEffect(() => {
    if (stream.phase === "done" || stream.phase === "idle" || stream.phase === "error") return;
    const t = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [stream.phase]);
  const etaLabel = getEtaLabel(stream.phase, stream.deltaLen);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {PIPELINE_STEPS.map((step, i) => {
        const stepIdx = PHASE_ORDER.indexOf(step.key);
        const isDone = !isError && (curIdx > stepIdx || stream.phase === "done");
        const isActive = stream.phase === step.key || (stream.phase === "revise" && step.key === "validate") || (stream.phase === "saving" && step.key === "validate");
        if (!isDone && !isActive && curIdx < stepIdx) return null;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 8, background: isActive ? "var(--accent-soft, rgba(129,140,248,0.1))" : "transparent" }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: isDone ? T.accent : isActive ? "var(--accent-soft, rgba(129,140,248,0.2))" : T.soft, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isDone ? 9 : 11, color: isDone ? "#fff" : T.muted, border: isActive ? `2px solid ${T.accent}` : "2px solid transparent", transition: "all 0.3s" }}>
              {isDone ? "✓" : isActive ? <BlinkDot /> : <span style={{ opacity: 0.4 }}>{i + 1}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: isDone ? T.muted : isActive ? T.ink : T.muted, fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{step.icon} {step.label}</div>
              {isActive && stream.label && <div style={{ color: T.accent, fontSize: 9, marginTop: 1, fontFamily: "var(--font-geist-mono), monospace" }}>{stream.label}</div>}
            </div>
            {isActive && etaLabel && (
              <span style={{ color: T.accent, fontSize: 9, fontFamily: "var(--font-geist-mono), monospace", flexShrink: 0, opacity: 0.9, background: "var(--accent-soft, rgba(129,140,248,0.15))", padding: "1px 5px", borderRadius: 4 }}>
                {etaLabel}
              </span>
            )}
            {isActive && !etaLabel && stream.deltaLen > 0 && <span style={{ color: T.muted, fontSize: 9, fontFamily: "var(--font-geist-mono), monospace", flexShrink: 0 }}>{stream.deltaLen}s</span>}
          </div>
        );
      })}
      {isError && (
        <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--error-soft, rgba(220,38,38,0.1))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.error, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", flexShrink: 0 }}>✕</div>
            <span style={{ color: T.error, fontSize: 12, fontWeight: 600 }}>分析失败，请重试</span>
          </div>
          {stream.errorMsg && <div style={{ color: T.muted, fontSize: 10, marginTop: 4, paddingLeft: 28, wordBreak: "break-all", fontFamily: "var(--font-geist-mono), monospace" }}>{stream.errorMsg}</div>}
        </div>
      )}
    </div>
  );
}

function BlinkDot() {
  return <span style={{ width: 5, height: 5, borderRadius: "50%", background: T.accent, display: "block", animation: "blink 1s steps(2) infinite" }} />;
}

// ─── Resource Card ────────────────────────────────────────────────────

function ResourceCard({ res }: { res: Resource }) {
  const typeColors: Record<string, string> = { link: T.accent, search: T.orange, person: T.purple, course: T.green };
  const typeLabels: Record<string, string> = { link: "🔗 链接", search: "🔎 搜索", person: "👤 老师", course: "📚 课程" };
  const color = typeColors[res.type] ?? T.muted;
  const clickable = !!(res.url || res.searchQuery);
  return (
    <div onClick={clickable ? () => { if (res.url) openExternalUrl(res.url); else if (res.searchQuery) window.open(`https://www.google.com/search?q=${encodeURIComponent(res.searchQuery)}`, "_blank", "noopener"); } : undefined}
      style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", cursor: clickable ? "pointer" : "default", background: T.soft }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color, background: "var(--accent-soft, rgba(129,140,248,0.12))", border: `1px solid ${T.line}`, borderRadius: 4, padding: "1px 5px" }}>{typeLabels[res.type] ?? res.type}</span>
        {res.platform && <span style={{ color: T.muted, fontSize: 9 }}>{res.platform}</span>}
      </div>
      <div style={{ color: T.ink, fontSize: 11, fontWeight: 500, lineHeight: 1.4 }}>{res.title}</div>
      {res.author && <div style={{ color: T.muted, fontSize: 10, marginTop: 2 }}>👤 {res.author}</div>}
      {res.searchQuery && !res.url && <div style={{ color: T.muted, fontSize: 10, marginTop: 2, fontFamily: "var(--font-geist-mono), monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>搜：{res.searchQuery}</div>}
    </div>
  );
}

// ─── RightPanel ──────────────────────────────────────────────────────

export interface RightPanelProps {
  entries: AnalysisEntry[];
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  regenAnalysis: (taskId: string, adjustment: string) => void;
  removeEntry: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
  /** 点击子任务 → 跳转到对应日期视图并高亮 */
  onJumpToSubtask?: (subtaskId: string, taskStartDate: string | null, startDay: number, durationDays: number) => void;
}

export function RightPanel({ entries, focusedId, setFocusedId, regenAnalysis, removeEntry, onToggleSubtask, onJumpToSubtask }: RightPanelProps) {
  const focused = entries.find((e) => e.taskId === focusedId) ?? entries[0] ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  // 移动端底部抽屉展开态（默认收起）
  const [sheetOpen, setSheetOpen] = useState(false);

  // 有正在运行的 entry 时自动展开
  const hasActive = entries.some(e => e.stream.phase !== "idle" && e.stream.phase !== "done" && e.stream.phase !== "error");
  // 任务开始分析时自动展开面板：这是"外部状态变化 → 展开"的响应式同步，
  // 必须在 effect 中完成（触发点在别的组件，无法放到事件处理器里），故此处
  // 的 setState 是合法的响应式同步，用块级禁用对应规则。
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (hasActive) { setCollapsed(false); if (isMobile) setSheetOpen(true); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hasActive, isMobile]);

  // 运行中的任务数量（用于移动端底部条角标）
  const runningCount = entries.filter(e => !["idle","done","error"].includes(e.stream.phase)).length;

  // 复用的标签页 + 内容主体
  const inner = (
    <>
      {entries.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "8px 12px", overflowX: "auto", borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          {entries.map((e) => {
            const running = !["idle","done","error"].includes(e.stream.phase);
            return (
              <button key={e.taskId} onClick={() => setFocusedId(e.taskId)} title={e.taskTitle} style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", border: `1px solid ${e.taskId === focusedId ? T.accent : T.line}`, background: e.taskId === focusedId ? "var(--accent-soft, rgba(129,140,248,0.12))" : "transparent", color: e.taskId === focusedId ? T.accent : T.muted, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis" }}>
                {running && <span style={{ animation: "blink 1s steps(2) infinite", marginRight: 3 }}>●</span>}
                {e.taskTitle.slice(0, 8)}{e.taskTitle.length > 8 ? "…" : ""}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {!focused ? <EmptyState /> : <EntryDetail entry={focused} onRegen={regenAnalysis} onRemove={removeEntry} onToggleSubtask={onToggleSubtask} onJumpToSubtask={onJumpToSubtask} />}
      </div>
    </>
  );

  // ── 移动端：底部抽屉 ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* 底部触发条（始终可见） */}
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 140,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            height: 46, border: "none", borderTop: `1px solid ${T.line}`,
            background: T.surface, color: T.ink, fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 -2px 10px rgba(0,0,0,0.15)",
          }}
        >
          <span style={{ fontSize: 15 }}>🤖</span> AI 分析面板
          {runningCount > 0 && (
            <span style={{ background: T.accent, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "1px 7px", display: "inline-flex", alignItems: "center", gap: 3 }}>
              <span style={{ animation: "blink 1s steps(2) infinite" }}>●</span>{runningCount}
            </span>
          )}
          <span style={{ color: T.muted, fontSize: 12 }}>▲</span>
        </button>

        {/* 遮罩 */}
        {sheetOpen && (
          <div onClick={() => setSheetOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150, backdropFilter: "blur(2px)" }} />
        )}

        {/* 抽屉本体：从底部滑出 */}
        <div style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 160,
          height: "80vh", maxHeight: "80vh",
          display: "flex", flexDirection: "column", overflow: "hidden",
          background: T.surface, borderTop: `1px solid ${T.line}`,
          borderRadius: "16px 16px 0 0", boxShadow: "0 -8px 30px rgba(0,0,0,0.3)",
          transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        }}>
          {/* 抓手 + 标题栏 */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.line }} />
            </div>
            <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.ink, fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>AI 分析面板</div>
                <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>意图→资源→计划→核查 · 全局排期</div>
              </div>
              <button onClick={() => setSheetOpen(false)} title="收起"
                style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: T.soft, color: T.muted, cursor: "pointer", fontSize: 15, lineHeight: 1 }}>×</button>
            </div>
          </div>
          {inner}
        </div>
      </>
    );
  }

  // ── 桌面端：固定右侧栏（可折叠） ──────────────────────────────────
  return (
    <div style={{
      width: collapsed ? 36 : 340,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: T.surface,
      borderLeft: `1px solid ${T.line}`,
      transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
    }}>
      {/* 面板标题栏 + 折叠按钮 */}
      <div style={{
        padding: "13px 12px 13px 16px",
        borderBottom: `1px solid ${T.line}`,
        background: T.surface,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent }} />
              <div className="font-editorial" style={{ color: T.ink, fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>
                AI 分析面板
              </div>
            </div>
            <div style={{ color: T.muted, fontSize: 11, marginTop: 2, fontFamily: "var(--font-serif), serif" }}>
              意图 · 资源 · 计划 · 核查 · 全局排期
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? "展开面板" : "收起面板"}
          style={{
            width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.line}`,
            background: T.soft, color: T.muted, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, transition: "all 0.15s", flexShrink: 0,
          }}
        >
          {collapsed ? "❯" : "❮"}
        </button>
      </div>
      {!collapsed && inner}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 60 }}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ color: T.muted }} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
      <span style={{ color: T.muted, fontSize: 13, textAlign: "center", lineHeight: 1.7 }}>
        点击「+ 新建任务」<br /><span style={{ fontSize: 11 }}>意图分析 → 资源搜索<br />制定计划 → 核查优化</span>
      </span>
    </div>
  );
}

function EntryDetail({ entry, onRegen, onRemove, onToggleSubtask, onJumpToSubtask }: {
  entry: AnalysisEntry;
  onRegen: (taskId: string, adj: string) => void;
  onRemove: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, cur: boolean) => void;
  onJumpToSubtask?: (subtaskId: string, taskStartDate: string | null, startDay: number, durationDays: number) => void;
}) {
  const [adj, setAdj] = useState("");
  const [showResources, setShowResources] = useState(false);
  const isRunning = !["idle","done","error"].includes(entry.stream.phase);
  const isDone = entry.stream.phase === "done";
  const task = entry.task;
  const completedCount = task?.subtasks.filter((s) => s.completed).length ?? 0;
  const totalCount = task?.subtasks.length ?? 0;
  const pct = totalCount > 0 ? completedCount / totalCount : 0;

  const allResources: Resource[] = [];
  if (task) {
    for (const s of task.subtasks) {
      if (s.resources) {
        try {
          const r = JSON.parse(s.resources) as Resource[];
          for (const res of r) { if (!allResources.some((x) => x.title === res.title)) allResources.push(res); }
        } catch { /* ignore */ }
      }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ color: T.ink, fontWeight: 700, fontSize: 15, lineHeight: 1.35, wordBreak: "break-all", letterSpacing: "-0.03em" }}>{entry.taskTitle}</div>
        {entry.topicCategory && <span style={{ display: "inline-block", marginTop: 4, background: "var(--accent-soft, rgba(129,140,248,0.12))", color: T.accent, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4 }}>{entry.topicCategory}</span>}
        {entry.rawInput && entry.rawInput !== entry.taskTitle && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <span style={{ background: T.soft, color: T.muted, fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, border: `1px solid ${T.line}`, letterSpacing: "0.04em", textTransform: "uppercase" as const, fontFamily: "var(--font-geist-mono), monospace", flexShrink: 0 }}>原始输入</span>
            <span style={{ color: T.muted, fontSize: 12 }}>{entry.rawInput}</span>
          </div>
        )}
        {task && <div style={{ color: T.muted, fontSize: 11, marginTop: 4, fontFamily: "var(--font-geist-mono), monospace" }}>{task.totalDays}天计划 · {completedCount}/{totalCount} 完成{task.status === "done" && <span style={{ marginLeft: 6, color: T.green }}>✓ 已完成</span>}</div>}
      </div>

      {(!isDone || !task) && <PipelineSteps stream={entry.stream} />}

      {isDone && task && (
        <>
          {/* 方向C：单个目标进度条 —— 部分完成也有可见推进感 */}
          <div style={{ background: T.soft, border: `1px solid ${T.line}`, borderRadius: 12, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>
                {(() => {
                  if (pct === 1) return "🎉 全部完成！";
                  if (completedCount === 0) return "开始你的第一步";
                  if (pct >= 0.75) return "🔥 就快完成了";
                  if (pct >= 0.5) return "💪 已过半，继续保持";
                  return "👍 已经起步，稳步推进";
                })()}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: pct === 1 ? T.green : T.accent, fontFamily: "var(--font-geist-mono), monospace" }}>
                {completedCount}/{totalCount}
                <span style={{ fontSize: 10, fontWeight: 500, color: T.muted, marginLeft: 4 }}>{Math.round(pct * 100)}%</span>
              </span>
            </div>
            <div style={{ height: 8, background: T.line, borderRadius: 9999, overflow: "hidden" }}>
              <div style={{ width: `${pct * 100}%`, height: "100%", background: pct === 1 ? T.green : T.accent, borderRadius: 9999, transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", borderRadius: 10, overflow: "hidden", border: `1px solid ${T.line}`, background: T.surface }}>
            {task.subtasks.map((s, i) => {
              let sr: Resource[] = [];
              if (s.resources) { try { sr = JSON.parse(s.resources) as Resource[]; } catch { /* ignore */ } }
              return (
                <div key={s.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${T.line}` }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "8px 11px", cursor: "pointer", background: T.surface }}>
                    <input type="checkbox" checked={s.completed} onChange={() => onToggleSubtask(entry.taskId, s.id, s.completed)} style={{ accentColor: T.accent, width: 13, height: 13, marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}
                      onClick={(e) => { e.preventDefault(); onJumpToSubtask?.(s.id, (task as unknown as {startDate?: string}).startDate ?? null, s.startDay, s.durationDays); }}>
                      <div style={{ color: s.completed ? T.muted : T.ink, fontSize: 12, letterSpacing: "-0.01em", textDecoration: s.completed ? "line-through" : "none", wordBreak: "break-all" }}>{s.title}</div>
                      {s.description && <div style={{ color: T.muted, fontSize: 10, marginTop: 1, lineHeight: 1.4 }}>{s.description}</div>}
                      {sr.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 4 }}>
                          {sr.map((r, ri) => {
                            // trust_level 颜色：verified=绿，search_only=橙，无字段=蓝/强调色
                            const tl = (r as unknown as { trust_level?: string }).trust_level;
                            const tagColor = tl === "verified" ? T.green
                              : tl === "search_only" ? T.warning : T.accent;
                            const tagBg = tl === "verified" ? "var(--success-soft, rgba(5,150,105,0.12))"
                              : tl === "search_only" ? "var(--warning-soft, rgba(217,119,6,0.12))" : "var(--accent-soft, rgba(129,140,248,0.12))";
                            const tagBorder = tl === "verified" ? "var(--success-soft, rgba(5,150,105,0.25))"
                              : tl === "search_only" ? "var(--warning-soft, rgba(217,119,6,0.25))" : "var(--accent-soft, rgba(129,140,248,0.25))";
                            return (
                            <span key={ri} onClick={(e) => { e.stopPropagation(); if (r.url) openExternalUrl(r.url); else if (r.searchQuery) window.open(`https://www.google.com/search?q=${encodeURIComponent(r.searchQuery)}`, "_blank", "noopener"); }}
                              style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: tagBg, color: tagColor, border: `1px solid ${tagBorder}`, cursor: r.url || r.searchQuery ? "pointer" : "default", whiteSpace: "nowrap", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis" }}
                              title={r.url || r.searchQuery || r.title}>
                              {tl === "verified" ? "✓" : tl === "search_only" ? "🔎" : (r.type === "link" ? "🔗" : r.type === "search" ? "🔎" : r.type === "person" ? "👤" : "📚")} {r.title.slice(0, 12)}{r.title.length > 12 ? "…" : ""}
                            </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <span style={{ color: T.green, fontSize: 10, fontFamily: "var(--font-geist-mono), monospace", flexShrink: 0 }}>{s.durationDays}天</span>
                  </label>
                </div>
              );
            })}
          </div>

          {allResources.length > 0 && (
            <div>
              <button onClick={() => setShowResources((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", background: "none", border: "none", cursor: "pointer", padding: "4px 0", color: T.ink, fontSize: 12, fontWeight: 600 }}>
                <span style={{ color: T.accent }}>📚</span> 全部推荐资源 ({allResources.length})
                <span style={{ marginLeft: "auto", color: T.muted, fontSize: 11 }}>{showResources ? "▲" : "▼"}</span>
              </button>
              {showResources && <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>{allResources.map((r, i) => <ResourceCard key={i} res={r} />)}</div>}
            </div>
          )}
        </>
      )}

      {isDone && (
        <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingTop: 2 }}>
          <div style={{ color: T.muted, fontSize: 11 }}>对计划有想法？输入调整意见后重新生成：</div>
          <textarea value={adj} onChange={(e) => setAdj(e.target.value)} placeholder="例：难度太高 / 专注某模块 / 增加实践内容" rows={2} disabled={isRunning} style={{ width: "100%", background: T.soft, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", color: T.ink, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onRegen(entry.taskId, adj); setAdj(""); }} disabled={isRunning} style={{ flex: 1, background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: isRunning ? "not-allowed" : "pointer", opacity: isRunning ? 0.5 : 1 }}>
              {isRunning ? "生成中…" : "↺ 重新生成"}
            </button>
            <button onClick={() => onRemove(entry.taskId)} style={{ background: T.soft, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>移除</button>
          </div>
        </div>
      )}

      {entry.stream.phase === "error" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onRegen(entry.taskId, "")} style={{ flex: 1, background: T.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>重试</button>
          <button onClick={() => onRemove(entry.taskId)} style={{ background: T.soft, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>移除</button>
        </div>
      )}
    </div>
  );
}
