"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { GradusLogo } from "@/components/ui/gradus-logo";
import { Modal } from "@/components/ui/modal";
import { RITUAL_TIPS } from "./ritual-phases";
import { RitualDoneState } from "./ritual-done-state";
import { RitualPipeline } from "./ritual-pipeline";
import { RitualStageCard } from "./ritual-stage-card";
import { RitualStageList } from "./ritual-stage-list";

interface AiGenerationRitualModalProps {
  isOpen?: boolean;
  goal: string;
  /** 流水线阶段：idle/intent/search/plan/validate/revise/saving/done/error */
  phase: string;
  /** 宿主传入的进度增量（沿用原有估算模型归一化为百分比） */
  elapsedSec: number;
  onMinimize?: () => void;
  onClose?: () => void;
  /** 规划完成后的收尾动作（宿主页可选注入，未提供时成功态给出回面板入口） */
  onDone?: () => void;
  /** 宿主支持「就地应用计划」时注入；缺省则不渲染该按钮，避免假动作 */
  onApply?: () => void;
}

/**
 * 屏三 · AI 规划弹层：遮罩 + 居中 720×640 白弹层（页头 / 可滚动主体 / 底栏），
 * 由 <Modal layer="ritual">（z-index 350）承载，压在首页所有浮层之上。
 * 纯展示组件：所有状态由 `phase` / `elapsedSec` 推导，自身不发请求；
 * 完成态整块换成 <RitualDoneState />，不再靠 CSS 隐藏流水线三件套。
 */
export function AiGenerationRitualModal({
  isOpen = true,
  goal,
  phase,
  elapsedSec,
  onMinimize,
  onClose,
  onDone,
  onApply,
}: AiGenerationRitualModalProps) {
  const [tipIndex, setTipIndex] = useState(0);

  // 定时轮播认知科学小贴士（沿用改造前的等待期提示行为）
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % RITUAL_TIPS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOpen]);

  const done = phase === "done";

  // 完成瞬间走全站唯一 toast 出口（原 RitualToast 副本已删）
  useEffect(() => {
    if (done) {
      toast.success("规划流水线已完成 · 回到今日面板查看排期");
    }
  }, [done]);

  if (!isOpen) return null;

  const dismiss = onMinimize ?? onClose;

  return (
    <>
      <Modal
        open
        onClose={dismiss ?? (() => {})}
        layer="ritual"
        width={720}
        height="min(640px, 88vh)"
        bodyClassName={
          done
            ? "grid place-items-center px-10 py-10"
            : "px-6 pb-3 pt-3.5"
        }
        icon={<GradusLogo size={15} />}
        title="AI 规划流水线"
        eyebrow="INTENT → RESOURCE → PLAN → VALIDATE"
        aria-label="AI 规划流水线"
        footer={
          <>
            <Mono className="text-text-3">规划期间可继续操作，取消不会删除已有任务</Mono>
            <div className="flex gap-2.5">
              {dismiss && (
                <Button variant="outline" size="sm" onClick={dismiss}>
                  {done ? "关闭" : "后台运行"}
                </Button>
              )}
              {onApply && !done && (
                <Button size="sm" onClick={onApply}>
                  应用计划
                </Button>
              )}
            </div>
          </>
        }
      >
        {done ? (
          <RitualDoneState goal={goal} onAction={onDone} />
        ) : (
          <>
            <RitualPipeline phase={phase} />
            <RitualStageCard phase={phase} elapsedSec={elapsedSec} />
            <RitualStageList phase={phase} />

            <Eyebrow kind="label" className="mt-3.5">
              认知科学视角
            </Eyebrow>
            <p className="text-body leading-[20px] text-text-2">{RITUAL_TIPS[tipIndex]}</p>
          </>
        )}
      </Modal>
    </>
  );
}
