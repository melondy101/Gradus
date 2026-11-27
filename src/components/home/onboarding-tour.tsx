"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ONBOARDING_STORAGE_KEY, TOUR_STEPS } from "./tour-steps";
import { getTourCardRect, getTourMaskRects } from "./tour-position";
import { TourSpotlight } from "./tour-spotlight";
import { TourCard } from "./tour-card";

interface OnboardingTourProps {
  onStartExample?: (goal: string) => void;
  onOpenNewTaskModal?: () => void;
}

/**
 * 新用户三步引导（聚光灯 + 气泡卡片）。首次访问 800ms 后自动弹出，
 * 监听 `open-gradus-tour` 事件可重播；样式走设计系统（遮罩/聚焦环/气泡卡见
 * tour-spotlight / tour-card，位置计算见 tour-position）。
 */
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
      if (localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;
      // 延时 800ms，等待页面骨架与侧边栏渲染稳定
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
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

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    } catch {}
    setIsOpen(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleClose();
    }
  }, [currentStepIndex, handleClose]);

  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const handleTryExample = useCallback(
    (exampleText: string) => {
      handleClose();
      if (onStartExample) {
        onStartExample(exampleText);
      } else if (onOpenNewTaskModal) {
        onOpenNewTaskModal();
      }
    },
    [handleClose, onStartExample, onOpenNewTaskModal]
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
        handleClose();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleClose]);

  if (!isOpen) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  return (
    <>
      <TourSpotlight
        maskRects={getTourMaskRects(targetRect, viewportWidth, viewportHeight)}
        targetRect={targetRect}
        onVeilClick={handleClose}
      />
      <TourCard
        step={step}
        currentStepIndex={currentStepIndex}
        cardRect={getTourCardRect(targetRect, step, viewportWidth, viewportHeight)}
        isLastStep={currentStepIndex === TOUR_STEPS.length - 1}
        onClose={handleClose}
        onPrev={handlePrev}
        onNext={handleNext}
        onJumpTo={setCurrentStepIndex}
        onTryExample={handleTryExample}
      />
    </>
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
