"use client";

import type { Subtask } from "@/lib/db/schema";
import { useTranslation } from "react-i18next";
import { GanttChart } from "./gantt-chart";
import type { TaskPhase } from "./task-phase";
import { T } from "@/lib/design-tokens";

type Phase = TaskPhase;

interface AnalysisPanelProps {
  phase: Phase;
  phaseLabel: string;
  subtasks: Subtask[];
  totalDays: number;
  goal: string;
  deltaLen?: number; // AI 已生成字符数
  errorMsg?: string;
}

const STEPS: { key: Phase }[] = [
  { key: "analyzing" },
  { key: "decomposing" },
  { key: "scheduling" },
  { key: "done" },
];

const PHASE_ORDER: Phase[] = [
  "idle", "analyzing", "decomposing", "scheduling", "done",
];

function phaseIdx(p: Phase) { return PHASE_ORDER.indexOf(p); }

export function AnalysisPanel({
  phase,
  subtasks,
  totalDays,
  goal,
  deltaLen = 0,
  errorMsg = "",
}: AnalysisPanelProps) {
  const { t } = useTranslation();
  const running = !["idle", "done", "error"].includes(phase);

  if (phase === "idle") {
    return (
      <p className="text-[14px]" style={{ color: T.muted }}>
        {goal ? t("analysisPanel.hintReady") : t("analysisPanel.hintEmpty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Kicker */}
      <div
        className="text-[12px] font-medium tracking-[0.08em] uppercase"
        style={{
          color: T.accent,
          fontFamily: "var(--font-geist-mono), monospace",
        }}
      >
        AI TASK RITUAL
      </div>

      {/* Ritual step rows */}
      <div className="flex flex-col" style={{ maxWidth: 620 }} aria-label={t("analysisPanel.progressAria")}>
        {STEPS.map((step, i) => {
          if (phaseIdx(phase) < phaseIdx(step.key)) return null;
          const done = phaseIdx(phase) > phaseIdx(step.key) || phase === "done";
          const active = phase === step.key;
          const popClass = `pop-in-${i + 1}`;

          return (
            <div
              key={step.key}
              className="flex items-center gap-3 py-[14px] px-0.5"
              style={{
                borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
                color: T.ink,
                fontSize: 15,
              }}
            >
              {/* Check circle */}
              <div
                className={`w-[22px] h-[22px] rounded-full grid place-items-center text-[13px] text-white flex-shrink-0 ${popClass}`}
                style={{
                  background: done
                    ? T.accent
                    : active
                    ? "var(--accent-soft, rgba(129,140,248,0.45))"
                    : "var(--accent-soft, rgba(129,140,248,0.15))",
                  boxShadow: done ? `0 0 0 5px var(--accent-soft, rgba(129,140,248,0.1))` : "none",
                  transition: "background 0.3s ease",
                }}
              >
                {done && "✓"}
                {active && !done && <BlinkDot />}
              </div>

              <span>{t(`analysisPanel.steps.${step.key}`)}</span>

              {/* Time tag / delta counter */}
              <span
                className="ml-auto text-[12px] hidden sm:block"
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  color: T.muted,
                }}
              >
                {done
                  ? "✓"
                  : active && step.key === "decomposing" && deltaLen > 0
                  ? t("analysisPanel.chars", { count: deltaLen })
                  : active
                  ? "…"
                  : ""}
              </span>
            </div>
          );
        })}

        {phase === "error" && (
          <div
            className="flex flex-col gap-1 py-[14px] px-0.5"
            style={{ borderTop: `1px solid ${T.line}` }}
          >
            <div className="flex items-center gap-3" style={{ color: T.error, fontSize: 15 }}>
              <div
                className="w-[22px] h-[22px] rounded-full grid place-items-center text-[13px] text-white flex-shrink-0"
                style={{ background: T.error }}
              >
                ✕
              </div>
              <span>{t("analysisPanel.failed")}</span>
            </div>
            {errorMsg && (
              <p
                className="text-[12px] pl-[34px]"
                style={{ color: T.muted, fontFamily: "var(--font-geist-mono), monospace", wordBreak: "break-all" }}
              >
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Running hint */}
      {running && (
        <p
          className="text-[12px]"
          style={{
            color: T.muted,
            fontFamily: "var(--font-geist-mono), monospace",
          }}
        >
          {t("analysisPanel.waiting")}
        </p>
      )}

      {/* Task cards + collapsible gantt when done */}
      {phase === "done" && subtasks.length > 0 && (
        <TaskCards subtasks={subtasks} totalDays={totalDays} />
      )}
    </div>
  );
}

function TaskCards({
  subtasks,
  totalDays,
}: {
  subtasks: Subtask[];
  totalDays: number;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-[20px] overflow-hidden border"
      style={{
        borderColor: T.line,
        background: T.surface,
        boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
      }}
    >
      {subtasks.map((s, i) => (
        <label
          key={s.id}
          className="grid items-center px-[18px] py-4 cursor-pointer transition-colors hover:bg-[var(--secondary)] active:scale-[0.99]"
          style={{
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            borderTop: i === 0 ? "none" : `1px solid ${T.line}`,
          }}
        >
          <input
            type="checkbox"
            readOnly
            checked={s.completed}
            style={{ accentColor: T.accent, width: 20, height: 20 }}
          />
          <span>
            <b className="text-[15px] font-semibold block" style={{ color: s.completed ? T.muted : T.ink, textDecoration: s.completed ? "line-through" : "none" }}>{s.title}</b>
            {s.description && (
              <small className="block mt-1 text-[13px]" style={{ color: T.muted }}>
                {s.description}
              </small>
            )}
          </span>
          <span
            className="text-[12px] font-medium"
            style={{
              color: T.accent,
              fontFamily: "var(--font-geist-mono), monospace",
            }}
          >
            {t("analysisPanel.days", { count: s.durationDays })}
          </span>
        </label>
      ))}

      <GanttChart
        subtasks={subtasks}
        totalDays={totalDays}
        animated={true}
        collapsible={true}
        defaultOpen={true}
      />
    </div>
  );
}

function BlinkDot() {
  return (
    <span
      className="w-2 h-2 rounded-full block"
      style={{ background: "white", animation: "blink 1s steps(2) infinite" }}
    />
  );
}
