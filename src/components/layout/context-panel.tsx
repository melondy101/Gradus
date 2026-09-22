"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ContextPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function ContextPanel({
  isOpen,
  onClose,
  title,
  children,
}: ContextPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* ── Mobile Backdrop ── */}
      <div
        className="sm:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* ── Desktop slide-in panel & Mobile bottom sheet ── */}
      <aside
        style={{
          background: "var(--card)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 40,
        }}
        className="
          fixed sm:relative inset-x-0 bottom-0 top-auto sm:top-0 sm:inset-x-auto
          h-[85vh] sm:h-full w-full sm:w-[380px] md:w-[420px]
          rounded-t-2xl sm:rounded-none
          flex flex-col flex-shrink-0 overflow-hidden
          animate-in slide-in-from-right-4 duration-200
        "
      >
        {/* Header bar */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--sans)",
                fontWeight: 700,
                fontSize: 14,
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              {title || "任务详情与 AI 智能体"}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="关闭面板"
            style={{
              background: "var(--secondary)",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.15s ease",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Panel Content Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </aside>
    </>
  );
}
