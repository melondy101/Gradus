"use client";

import React from "react";
import { BLOOM_CONFIG } from "@/lib/design-tokens";

interface BloomStaircaseProps {
  levels: number[];
  completed: boolean[];
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onStepClick?: (level: number) => void;
}

export function BloomStaircase({
  levels,
  completed,
  size = "sm",
  interactive = false,
  onStepClick,
}: BloomStaircaseProps) {
  // Count total & completed per bloom level (1 to 6)
  const stepStats = [1, 2, 3, 4, 5, 6].map((lvl) => {
    let total = 0;
    let done = 0;
    levels.forEach((l, idx) => {
      if (l === lvl) {
        total++;
        if (completed[idx]) done++;
      }
    });
    return {
      level: lvl,
      total,
      done,
      hasTasks: total > 0,
      isComplete: total > 0 && done === total,
      ratio: total > 0 ? done / total : 0,
      config: BLOOM_CONFIG[lvl as keyof typeof BLOOM_CONFIG],
    };
  });

  if (size === "sm") {
    // 6-step micro staircase for card views
    return (
      <div
        className="flex items-end gap-[3px]"
        style={{ height: 22, width: 48 }}
        title="认知攀登阶梯 (Bloom's Taxonomy)"
      >
        {stepStats.map((st) => {
          const heightPercent = 25 + (st.level - 1) * 15; // 25% -> 100%
          const colorVar = `var(--bloom-${st.level})`;

          return (
            <div
              key={st.level}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                borderRadius: 2,
                background: st.done > 0
                  ? colorVar
                  : st.hasTasks
                  ? "var(--secondary)"
                  : "transparent",
                border: st.hasTasks && st.done === 0
                  ? `1px solid var(--border)`
                  : "none",
                opacity: st.hasTasks ? (st.done > 0 ? 1 : 0.6) : 0.2,
                transition: "all 0.2s ease",
              }}
            />
          );
        })}
      </div>
    );
  }

  // Medium / Large display for context inspector & task detail
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: size === "lg" ? "16px" : "12px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-outfit), Outfit, sans-serif", color: "var(--foreground)" }}>
            认知阶梯攀登
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)", fontFamily: "var(--font-jetbrains), monospace" }}>
            Bloom Ascent
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--accent)",
            fontWeight: 600,
            background: "var(--accent-soft)",
            padding: "2px 8px",
            borderRadius: 99,
          }}
        >
          {completed.filter(Boolean).length} / {levels.length} 阶达成
        </span>
      </div>

      {/* Stepped stair visualization */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          height: size === "lg" ? 80 : 54,
          padding: "4px 0",
        }}
      >
        {stepStats.map((st) => {
          const heightPercent = 20 + (st.level - 1) * 16;
          const colorVar = `var(--bloom-${st.level})`;

          return (
            <div
              key={st.level}
              onClick={() => interactive && onStepClick?.(st.level)}
              style={{
                flex: 1,
                height: `${heightPercent}%`,
                borderRadius: "6px 6px 2px 2px",
                background: st.done > 0
                  ? `linear-gradient(180deg, ${colorVar}, var(--card))`
                  : st.hasTasks
                  ? "var(--secondary)"
                  : "var(--secondary)",
                border: `1px solid ${st.hasTasks ? colorVar : "var(--border)"}`,
                opacity: st.hasTasks ? (st.done > 0 ? 1 : 0.7) : 0.25,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 2px",
                cursor: interactive ? "pointer" : "default",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
              title={`${st.config.name} (${st.config.nameEn}): ${st.done}/${st.total} 完成`}
            >
              {st.hasTasks && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: st.done > 0 ? "var(--foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {st.done}/{st.total}
                </span>
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: st.hasTasks ? "var(--foreground)" : "var(--muted-foreground)",
                  fontFamily: "var(--font-outfit), sans-serif",
                }}
              >
                L{st.level}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend below */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted-foreground)", paddingTop: 4 }}>
        <span>L1 识记 (基础)</span>
        <span>L6 创造 (精通)</span>
      </div>
    </div>
  );
}
