"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Level } from "@/lib/growth";

const T = {
  surface: "#FFFFFF", ink: "#111111", muted: "#777B75",
} as const;

/** 方向B：里程碑等级解锁弹窗 */
export function MilestoneUnlockModal({ level, onClose }: { level: Level; onClose: () => void }) {
  const { t } = useTranslation();
  // 自动关闭
  useEffect(() => {
    const timer = setTimeout(onClose, 4200);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.35)", zIndex: 400, backdropFilter: "blur(3px)" }}
      />
      <div
        role="dialog"
        aria-label={t("milestone.ariaLabel")}
        className="milestone-pop"
        style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          zIndex: 401, width: "min(340px, 90vw)",
          background: T.surface, borderRadius: 20, overflow: "hidden",
          border: `1px solid ${level.color}44`,
          boxShadow: `0 24px 70px ${level.color}33, 0 8px 24px rgba(17,17,17,0.12)`,
          textAlign: "center",
        }}
      >
        {/* 顶部渐变光带 */}
        <div style={{
          background: `linear-gradient(135deg, ${level.color}, ${level.color}CC)`,
          padding: "26px 20px 22px", color: "#fff",
        }}>
          <div className="milestone-badge" style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px",
            background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38,
          }}>{level.icon}</div>
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.9, letterSpacing: "0.08em" }}>{t("milestone.unlockTitle")}</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 3 }}>{t("milestone.level", { name: level.name })}</div>
        </div>

        {/* 说明 */}
        <div style={{ padding: "16px 22px 20px" }}>
          <div style={{ color: T.ink, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {t("milestone.reached", { threshold: level.threshold })}
          </div>
          <div style={{ color: T.muted, fontSize: 12.5, lineHeight: 1.6 }}>
            {t("milestone.encourage")}
          </div>
          <button
            onClick={onClose}
            style={{
              marginTop: 16, width: "100%",
              background: level.color, color: "#fff", border: "none",
              borderRadius: 12, padding: "11px 0", fontSize: 14, fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("milestone.keepGoing")}
          </button>
        </div>
      </div>
    </>
  );
}
