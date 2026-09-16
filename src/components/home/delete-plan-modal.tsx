"use client";

import React, { useEffect } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { T } from "@/lib/design-tokens";

interface DeletePlanModalProps {
  isOpen: boolean;
  taskTitle: string;
  subtaskCount?: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePlanModal({
  isOpen,
  taskTitle,
  subtaskCount,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeletePlanModalProps) {
  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        aria-hidden="true"
        onClick={() => {
          if (!isDeleting) onCancel();
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.45)",
          zIndex: 350,
          backdropFilter: "blur(3px)",
        }}
      />

      {/* 居中对话框 */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-desc"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: T.surface,
          border: `1px solid ${T.line}`,
          borderRadius: 16,
          padding: "24px",
          width: "min(420px, 92vw)",
          zIndex: 351,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* 头部图标与标题 */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: "#EF4444",
            }}
          >
            <Trash2 size={20} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="delete-dialog-title"
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: T.ink,
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              确认删除该学习计划？
            </h3>
            <p
              id="delete-dialog-desc"
              style={{
                fontSize: 13,
                color: T.muted,
                margin: "6px 0 0",
                lineHeight: 1.55,
              }}
            >
              您即将删除计划{" "}
              <strong style={{ color: T.ink, wordBreak: "break-all" }}>
                「{taskTitle || "未命名计划"}」
              </strong>
              。
              {typeof subtaskCount === "number" && subtaskCount > 0
                ? `该计划下的 ${subtaskCount} 个子任务、认知阶梯与学习资源都将被永久移除。`
                : "该计划的所有分析数据与进度将被永久移除。"}
            </p>
          </div>
        </div>

        {/* 风险警示条 */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: 8,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#D97706",
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>此操作不可逆，删除后无法恢复已有的学习进度。</span>
        </div>

        {/* 底部操作按钮 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              background: T.soft,
              color: T.ink,
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            取消
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              background: "#DC2626",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: isDeleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
              opacity: isDeleting ? 0.7 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {isDeleting ? "正在删除..." : "确认删除"}
          </button>
        </div>
      </div>
    </>
  );
}
