"use client";

// ─── CongratulationsModal ─────────────────────────────────────────────
// 弹出时机：某个大任务下所有子任务全部勾选完成

import type { SubtaskWithTask } from "@/lib/api/tasks";
import { useTranslation } from "react-i18next";

import { T } from "@/lib/design-tokens";

export interface CongratsData {
  taskTitle: string;
  taskId: string;
  subtasks: SubtaskWithTask[];
}

interface Props {
  data: CongratsData;
  onClose: () => void;
  onLearnMore: (taskId: string) => void;
  onGenerateCertificate?: (data: CongratsData) => void;
}

export function CongratulationsModal({ data, onClose, onLearnMore, onGenerateCertificate }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(17,17,17,0.35)", backdropFilter: "blur(4px)",
        }}
      />
      {/* Card */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: T.surface, border: `1px solid ${T.line}`,
        borderRadius: 20, padding: "28px 28px 22px",
        width: "min(460px, 93vw)", maxHeight: "85vh",
        overflowY: "auto", zIndex: 301,
        boxShadow: "0 24px 80px rgba(17,17,17,0.14)",
        display: "flex", flexDirection: "column", gap: 18,
      }}>

        {/* Trophy + Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, lineHeight: 1, marginBottom: 12 }}>🎉</div>
          <div style={{ color: T.ink, fontWeight: 800, fontSize: 20, letterSpacing: "-0.04em", lineHeight: 1.2 }}>
            {t("congrats.title")}
          </div>
          <div style={{ color: T.accent, fontWeight: 700, fontSize: 16, marginTop: 6, letterSpacing: "-0.03em" }}>
            「{data.taskTitle}」
          </div>
        </div>

        {/* Achievement summary */}
        <div style={{ background: "linear-gradient(135deg, #f0f9f4, #e8f4fd)", borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ color: T.green, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            {t("congrats.learned")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.subtasks.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ color: T.green, fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: T.ink, fontSize: 13, fontWeight: 500 }}>{s.title}</span>
                  {s.description && (
                    <div style={{ color: T.muted, fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{s.description}</div>
                  )}
                </div>
                <span style={{ color: T.green, fontSize: 10, fontFamily: "monospace", flexShrink: 0 }}>
                  {t("congrats.days", { count: s.durationDays })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Topic badge if available */}
        {data.subtasks[0]?.topic && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{
              background: "rgba(59,122,255,0.08)", color: T.accent,
              border: "1px solid rgba(59,122,255,0.2)",
              fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20,
            }}>
              {t("congrats.topic", { topic: data.subtasks[0].topic })}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onGenerateCertificate && (
            <button
              onClick={() => onGenerateCertificate(data)}
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(79,70,229,0.25)",
              }}
            >
              <span>🏆 生成结业证书 & 分享海报</span>
            </button>
          )}
          <button
            onClick={() => onLearnMore(data.taskId)}
            style={{
              background: T.accent, color: "#fff", border: "none",
              borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 600,
              cursor: "pointer", letterSpacing: "-0.02em",
            }}
          >
            {t("congrats.learnMore")}
          </button>
          <button
            onClick={onClose}
            style={{
              background: "none", color: T.muted, border: "none",
              fontSize: 12, cursor: "pointer", padding: "4px 0",
              letterSpacing: "-0.01em",
            }}
          >
            {t("congrats.close")}
          </button>
        </div>
      </div>
    </>
  );
}
