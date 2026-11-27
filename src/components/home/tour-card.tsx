"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/eyebrow";
import { TOUR_STEPS, type TourStep } from "./tour-steps";
import { TOUR_Z, type TourCardRect } from "./tour-position";
import { cn } from "@/utils/utils";

interface TourCardProps {
  step: TourStep;
  currentStepIndex: number;
  cardRect: TourCardRect;
  isLastStep: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpTo: (index: number) => void;
  onTryExample: (goal: string) => void;
}

/**
 * 引导气泡卡片 —— 弹层语言与 Modal 一致：
 * radius-popover 20 白卡 + 弹层投影 + 页头（图标/眉题/标题/关闭）+ 正文 + 底栏（进度点/按钮）。
 */
export function TourCard({
  step,
  currentStepIndex,
  cardRect,
  isLastStep,
  onClose,
  onPrev,
  onNext,
  onJumpTo,
  onTryExample,
}: TourCardProps) {
  const Icon = step.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`tour-step-${currentStepIndex}`}
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "fixed",
          top: cardRect.top,
          left: cardRect.left,
          width: cardRect.width,
          translate: cardRect.centered ? "-50% -50%" : undefined,
          zIndex: TOUR_Z.card,
        }}
      >
        <div className="relative flex flex-col gap-3 overflow-hidden rounded-popover border border-bd-card bg-card p-5 text-ink shadow-[var(--shadow-lg)]">
          {/* 页头：步骤图标 + 眉题 + 标题 + 关闭 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 flex-none place-items-center rounded-tile bg-accent-soft text-accent-ink">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <Mono className="block text-2xs text-text-3">{step.badge}</Mono>
                <h3 className="text-title-sm leading-tight font-black">{step.title}</h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="关闭引导"
              title="跳过新手引导 (ESC)"
            >
              <X size={15} />
            </Button>
          </div>

          {/* 正文 */}
          <p className="text-body leading-relaxed text-text-2">{step.description}</p>

          {step.exampleGoal && (
            <div className="rounded-field border border-dashed border-bd-check bg-cream-light px-3 py-2.5">
              <Mono className="flex items-center gap-1 text-2xs text-text-2">
                <Zap size={12} className="text-error" />
                即刻尝鲜（无需手动构思）：
              </Mono>
              <Button
                variant="secondary"
                className="mt-2 h-auto w-full justify-between gap-2 px-3 py-2 text-caption font-semibold"
                onClick={() => onTryExample(step.exampleGoal!)}
              >
                <span className="truncate">{step.exampleGoal}</span>
                <span className="flex flex-none items-center gap-0.5 font-bold">
                  一键拆解
                  <ChevronRight size={13} />
                </span>
              </Button>
            </div>
          )}

          {/* 底栏：进度点 + 上一步 / 下一步 */}
          <div className="flex items-center justify-between border-t border-bd-card pt-3">
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onJumpTo(idx)}
                  aria-label={`跳转到第 ${idx + 1} 步`}
                  title={`跳转到第 ${idx + 1} 步`}
                  className={cn(
                    "h-1.5 rounded-pill transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    idx === currentStepIndex
                      ? "w-4 bg-error"
                      : "w-1.5 bg-bd-check hover:bg-text-3"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <Button variant="outline" size="sm" onClick={onPrev}>
                  <ChevronLeft size={14} />
                  上一步
                </Button>
              )}
              <Button size="sm" onClick={onNext}>
                {isLastStep ? "开始探索" : "下一步"}
                {!isLastStep && <ChevronRight size={14} />}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
