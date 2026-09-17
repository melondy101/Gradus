"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Brain,
  Search,
  Layers,
  CheckCircle2,
  Minimize2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export interface RitualStep {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  estDurationSec: number;
}

const SCIENTIFIC_TIPS = [
  "💡 布鲁姆认知分类法（Bloom's Taxonomy）：从识记 (L1) 到创造 (L6)，学习留存率由 10% 跃升至 90%。",
  "💡 维果茨基最近发展区（ZPD）：AI 正在先锚定你的先备知识边界，避免目标难度过大引发挫败感。",
  "💡 真实白名单检索：拾级严格执行两阶段检索，绝不凭空编造虚假 URL，所有资源均经过权威性打分。",
  "💡 每日交错槽位调度：算法将自动交错不同认知难度的子任务，防止高负荷认知连续扎堆。",
  "💡 艾宾浩斯间隔复习：系统会在关键节点自动为你生成 +2天、+7天 的复习提醒，固化长时记忆。",
  "💡 费曼学习法：在高阶创造与评价阶段，我们将引导你产出公开笔记与可执行项目，实现认知闭环。",
];

interface AiGenerationRitualModalProps {
  isOpen: boolean;
  goal: string;
  phase: string;
  elapsedSec: number;
  onMinimize?: () => void;
  onClose?: () => void;
}

export function AiGenerationRitualModal({
  isOpen,
  goal,
  phase,
  elapsedSec,
  onMinimize,
}: AiGenerationRitualModalProps) {
  const [tipIndex, setTipIndex] = useState(0);

  // 定时轮播科学学习小贴士
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % SCIENTIFIC_TIPS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen]);

  const steps: RitualStep[] = useMemo(
    () => [
      {
        key: "intent",
        title: "1. 意图洞察与布鲁姆认知目标锚定",
        subtitle: "基于 Vygotsky ZPD 评估先备知识，反向设计认知终点 (L1~L6)",
        icon: <Brain size={16} />,
        estDurationSec: 8,
      },
      {
        key: "search",
        title: "2. 真实权威学习资源检索与三维校验",
        subtitle: "Tavily 白名单检索真实文档与视频，校验 URL 存活与权威分",
        icon: <Search size={16} />,
        estDurationSec: 14,
      },
      {
        key: "plan",
        title: "3. 渐进式认知阶梯排期与槽位编排",
        subtitle: "拆解为 4~8 个严密可执行子阶段，匹配每日精力容量",
        icon: <Layers size={16} />,
        estDurationSec: 23,
      },
      {
        key: "validate",
        title: "4. 认知阶梯合理性与抗编造核查",
        subtitle: "核查认知跳跃与可行性，生成艾宾浩斯间隔复习节点",
        icon: <ShieldCheck size={16} />,
        estDurationSec: 15,
      },
      {
        key: "saving",
        title: "5. 全局接续排期落库与日历准备",
        subtitle: "注册时间轴槽位，生成 WebCal / iCal 实时订阅",
        icon: <CheckCircle2 size={16} />,
        estDurationSec: 5,
      },
    ],
    []
  );

  if (!isOpen) return null;

  // 计算当前处于第几步 (0 ~ 4)
  let activeStepIndex = 0;
  if (phase === "search") activeStepIndex = 1;
  else if (phase === "plan") activeStepIndex = 2;
  else if (phase === "validate" || phase === "revise") activeStepIndex = 3;
  else if (phase === "saving") activeStepIndex = 4;
  else if (phase === "done") activeStepIndex = 5;

  // 平滑计算模拟进度百分比 (0% ~ 96%)
  const totalEst = 65;
  const progressPct =
    phase === "done"
      ? 100
      : Math.min(96, Math.max(8, Math.round((elapsedSec / totalEst) * 90) + 6));

  return (
    <>
      {/* 遮罩 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 29, 0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 350,
        }}
      />

      {/* 弹窗主体 */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(560px, 94vw)",
          background: "var(--card)",
          borderRadius: 24,
          border: "1px solid var(--border)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
          zIndex: 351,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 顶部状态条 */}
        <div
          style={{
            padding: "20px 22px 16px",
            background: "linear-gradient(180deg, var(--secondary) 0%, var(--card) 100%)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "var(--foreground)" }}>
                    AI 认知阶梯深度规划中
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      borderRadius: 99,
                      padding: "2px 8px",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {progressPct}%
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                    marginTop: 2,
                    maxWidth: 380,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  目标：<strong style={{ color: "var(--foreground)" }}>「{goal}」</strong>
                </div>
              </div>
            </div>

            {onMinimize && (
              <button
                onClick={onMinimize}
                title="后台最小化，继续浏览其他任务"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--secondary)",
                  color: "var(--muted-foreground)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Minimize2 size={12} />
                <span>后台运行</span>
              </button>
            )}
          </div>

          {/* 进度条 */}
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "var(--border)",
              marginTop: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: "100%",
                background: "linear-gradient(90deg, #4F46E5, #34D399)",
                borderRadius: 3,
                transition: "width 0.4s ease-out",
              }}
            />
          </div>
        </div>

        {/* 5 个核心执行阶段 */}
        <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
          {steps.map((step, idx) => {
            const isDone = activeStepIndex > idx || phase === "done";
            const isActive = activeStepIndex === idx && phase !== "done";

            return (
              <div
                key={step.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: isActive
                    ? "var(--accent-soft)"
                    : isDone
                    ? "var(--secondary)"
                    : "transparent",
                  border: `1px solid ${
                    isActive ? "var(--accent)" : isDone ? "var(--border)" : "transparent"
                  }`,
                  transition: "all 0.25s ease",
                  opacity: isActive ? 1 : isDone ? 0.9 : 0.45,
                }}
              >
                {/* 阶段圆圈图标 */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: isDone
                      ? "var(--success)"
                      : isActive
                      ? "var(--accent)"
                      : "var(--border)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: isActive ? "0 0 12px var(--accent)" : "none",
                  }}
                >
                  {isDone ? "✓" : isActive ? step.icon : idx + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 600,
                      color: isActive
                        ? "var(--foreground)"
                        : isDone
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{step.title}</span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--accent)",
                          background: "var(--card)",
                          border: "1px solid var(--accent)",
                          borderRadius: 4,
                          padding: "0 5px",
                          animation: "pulse 1.5s infinite",
                        }}
                      >
                        处理中...
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      marginTop: 2,
                    }}
                  >
                    {step.subtitle}
                  </div>
                </div>

                {isActive && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--accent)",
                      fontFamily: "var(--font-jetbrains), monospace",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={12} />
                    <span>{elapsedSec}s</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 底部轮播科学学习理念 */}
        <div
          style={{
            padding: "12px 20px",
            background: "var(--secondary)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
          <div
            style={{
              flex: 1,
              fontSize: 11.5,
              color: "var(--muted-foreground)",
              lineHeight: 1.4,
              fontFamily: "var(--font-dm-sans), sans-serif",
            }}
          >
            {SCIENTIFIC_TIPS[tipIndex]}
          </div>
        </div>
      </div>
    </>
  );
}
