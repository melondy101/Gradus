"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  HelpCircle,
} from "lucide-react";
import { T } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";

export interface TourStep {
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  preferredPlacement?: "bottom" | "top" | "right" | "left";
  actionHint?: string;
  exampleGoal?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "#nav-btn-new-plan",
    title: "第一步：输入模糊学习目标",
    subtitle: "从一句话或一段链接开启规划",
    description:
      "无需担心目标过于模糊。点击侧栏「新建计划」或按键盘 N，输入任何你想掌握的知识（如“精通 Python 异步编程”或粘贴 B站/arXiv/GitHub 链接），AI 引擎会自动解析意图与前置背景。",
    badge: "1 / 3 目标解析",
    icon: Sparkles,
    preferredPlacement: "bottom",
    actionHint: "可点击下方按钮一键填入精选示例试用：",
    exampleGoal: "精通 Python 异步编程与 asyncio 实战",
  },
  {
    targetSelector: "#nav-rail-group",
    fallbackSelector: "#nav-item-steps",
    title: "第二步：循序渐进的布鲁姆认知阶梯",
    subtitle: "告别认知过载，全局接续排期",
    description:
      "AI 规划流水线依据布鲁姆教育目标分类学（记忆 ➔ 理解 ➔ 应用 ➔ 分析 ➔ 评估 ➔ 创造）由浅入深构建任务梯度，并智能错开认知负载、分配到每日学习槽位中。",
    badge: "2 / 3 认知阶梯",
    icon: TrendingUp,
    preferredPlacement: "right",
  },
  {
    targetSelector: "#panel-right-container",
    fallbackSelector: "#today-task-area",
    title: "第三步：权威资源推荐与打卡成长",
    subtitle: "真实可信链接，步步扎实留痕",
    description:
      "所有任务均基于 Tavily 深度检索官方文档、学术论文与权威视频，杜绝编造链接。完成学习后一键打卡，自动累计深度学习时长并解锁阶段性成长里程碑！",
    badge: "3 / 3 权威资源",
    icon: BookOpen,
    preferredPlacement: "left",
  },
];

const ONBOARDING_STORAGE_KEY = "gradus_onboarding_completed_v1";

interface OnboardingTourProps {
  onStartExample?: (goal: string) => void;
  onOpenNewTaskModal?: () => void;
}

export function OnboardingTour({
  onStartExample,
  onOpenNewTaskModal,
}: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // 检查是否初次访问
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!completed) {
        // 延时 800ms，等待页面骨架与侧边栏渲染稳定
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // 监听全局触发重新播放新手引导事件
  useEffect(() => {
    const handleOpen = () => {
      setCurrentStepIndex(0);
      setIsOpen(true);
    };
    window.addEventListener("open-gradus-tour", handleOpen);
    return () => window.removeEventListener("open-gradus-tour", handleOpen);
  }, []);

  const step = TOUR_STEPS[currentStepIndex];

  const handleSkip = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
    setIsOpen(false);
  }, []);

  const handleComplete = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
    setIsOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStepIndex, handleComplete]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleTryExample = useCallback(
    (exampleText: string) => {
      handleComplete();
      if (onStartExample) {
        onStartExample(exampleText);
      } else if (onOpenNewTaskModal) {
        onOpenNewTaskModal();
      }
    },
    [handleComplete, onStartExample, onOpenNewTaskModal]
  );

  // 寻找并计算高亮目标元素的位置
  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;

    let el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!el && step.fallbackSelector) {
      el = document.querySelector(step.fallbackSelector) as HTMLElement | null;
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }
    setTargetRect(null);
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;

    // Use requestAnimationFrame to avoid synchronous setState warning
    const rafId = requestAnimationFrame(() => {
      updateTargetRect();
    });

    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  // 快捷键支持 (ESC: 关闭, ArrowRight: 下一步, ArrowLeft: 上一步)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleSkip]);

  if (!isOpen) return null;

  // 气泡卡片位置计算
  const getCardStyle = (): React.CSSProperties => {
    const cardWidth = 380;
    const padding = 16;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 768;

    // 如果未找到元素或屏幕太小，居中显示
    if (!targetRect || viewportWidth < 640) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(90vw, 400px)",
        zIndex: 10002,
      };
    }

    const { top, bottom, left, right, width, height } = targetRect;
    const placement = step.preferredPlacement || "bottom";

    let posTop = 0;
    let posLeft = 0;

    if (placement === "bottom") {
      posTop = bottom + padding;
      posLeft = left + width / 2 - cardWidth / 2;
      // 边界约束
      posLeft = Math.max(20, Math.min(posLeft, viewportWidth - cardWidth - 20));
      if (posTop + 260 > viewportHeight) {
        posTop = Math.max(20, top - 270);
      }
    } else if (placement === "right") {
      posTop = Math.max(20, top + height / 2 - 130);
      posLeft = right + padding;
      if (posLeft + cardWidth > viewportWidth) {
        posLeft = Math.max(20, left - cardWidth - padding);
      }
    } else if (placement === "left") {
      posTop = Math.max(20, top + height / 2 - 130);
      posLeft = Math.max(20, left - cardWidth - padding);
      if (posLeft < 20) {
        posLeft = right + padding;
      }
    } else {
      // top
      posTop = Math.max(20, top - 270);
      posLeft = Math.max(20, Math.min(left + width / 2 - cardWidth / 2, viewportWidth - cardWidth - 20));
    }

    return {
      position: "fixed",
      top: `${posTop}px`,
      left: `${posLeft}px`,
      width: `${cardWidth}px`,
      zIndex: 10002,
    };
  };

  const IconComponent = step.icon;
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="onboarding-tour-root">
      {/* ── 遮罩层 (Spotlight Mask) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(14, 13, 11, 0.45)",
          backdropFilter: "blur(3px)",
          zIndex: 10000,
          pointerEvents: "auto",
        }}
        onClick={handleSkip}
      />

      {/* ── 高亮聚焦边框 (Target Spotlight Ring) ── */}
      {targetRect && (
        <motion.div
          key={`spotlight-${currentStepIndex}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{
            opacity: 1,
            scale: 1,
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{
            position: "fixed",
            borderRadius: 12,
            boxShadow: `0 0 0 4px ${T.accent}, 0 0 24px var(--accent-soft), inset 0 0 12px var(--accent-soft)`,
            border: `2px solid var(--card)`,
            zIndex: 10001,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── 气泡卡片 (Tour Bubble Card) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tour-step-${currentStepIndex}`}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={getCardStyle()}
        >
          <div
            style={{
              background: "var(--card)",
              border: `1px solid ${T.line}`,
              borderRadius: 16,
              boxShadow: "0 16px 40px -8px rgba(0, 0, 0, 0.25), 0 4px 16px rgba(0,0,0,0.06)",
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
              color: T.ink,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* 顶部渐变装饰条 */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${T.accent}, var(--accent-deep))`,
              }}
            />

            {/* 头部：步骤 Badge + 标题 + 关闭按钮 */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "var(--accent-soft)",
                    color: "var(--accent-ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--accent-ink)",
                      fontFamily: "var(--font-jetbrains), monospace",
                    }}
                  >
                    {step.badge}
                  </div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.ink,
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleSkip}
                title="跳过新手引导 (ESC)"
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  padding: 4,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "color 0.15s",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* 内容文案 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: T.muted,
                  margin: 0,
                }}
              >
                {step.description}
              </p>

              {/* Step 1 特别支持：一键体验示例 */}
              {step.exampleGoal && (
                <div
                  style={{
                    background: "var(--cream-light)",
                    border: `1px dashed var(--bd-check)`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 2,
                  }}
                >
                  <div style={{ fontSize: 11, color: "var(--accent-ink)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <Zap size={13} />
                    <span>即刻尝鲜（无需手动构思）：</span>
                  </div>
                  <button
                    onClick={() => handleTryExample(step.exampleGoal!)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--card)",
                      border: `1px solid ${T.line}`,
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: T.ink,
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = T.accent;
                      e.currentTarget.style.color = "var(--accent-ink)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = T.line;
                      e.currentTarget.style.color = T.ink;
                    }}
                  >
                    <span>{step.exampleGoal}</span>
                    <span style={{ color: "var(--accent-ink)", fontWeight: 700 }}>一键拆解 →</span>
                  </button>
                </div>
              )}
            </div>

            {/* 底部控制器：进度点 + 上一步 / 下一步 / 完成 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 8,
                borderTop: `1px solid ${T.line}`,
                marginTop: 2,
              }}
            >
              {/* 进度指示小圆点 */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {TOUR_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStepIndex(idx)}
                    style={{
                      width: idx === currentStepIndex ? 18 : 6,
                      height: 6,
                      borderRadius: 99,
                      background: idx === currentStepIndex ? T.accent : T.soft,
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    title={`跳转到第 ${idx + 1} 步`}
                  />
                ))}
              </div>

              {/* 按钮组 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrev}
                    style={{
                      background: "transparent",
                      border: `1px solid ${T.line}`,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      color: T.muted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronLeft size={14} />
                    <span>上一步</span>
                  </button>
                )}

                <button
                  onClick={handleNext}
                  style={{
                    background: T.accent,
                    color: "var(--accent-foreground)",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    boxShadow: "0 2px 8px var(--accent-soft)",
                    transition: "opacity 0.15s",
                  }}
                >
                  <span>{isLastStep ? "开始探索 " : "下一步"}</span>
                  {!isLastStep && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * 新手引导触发按钮（挂载在页脚快捷键条）——
 * ui Button ghost 形态（签字点③ 2026-09-26，替代原手写内联样式按钮）。
 */
export function TourHelpButton() {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => window.dispatchEvent(new CustomEvent("open-gradus-tour"))}
      title="查看功能指引 (Tour)"
    >
      <HelpCircle size={13} />
      <span>新手指引</span>
    </Button>
  );
}
