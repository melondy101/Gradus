"use client";

import { useEffect, useState } from "react";

import {
  PHASE_LABELS,
  getEtaLabel,
  phaseForElapsed,
  stageIndexOf,
} from "@/components/home/analysis-pipeline";
import { AiPill } from "@/components/ui/ai-pill";
import { Mono } from "@/components/ui/eyebrow";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/**
 * 真实流水线跑完四阶段要 42 秒以上， Landing 上按这个节奏访客根本看不出它在动，
 * 所以这里把同一个时间轴 3 倍速循环播放：阶段名、序号与「约还需 X 秒」全部由
 * analysis-pipeline 的 phaseForElapsed / getEtaLabel 现算，不另写一套文案。
 * 播到 saving 阶段报「即将完成…」时归零重来。
 */
const SPEED = 3;
const LOOP_SEC = 18.4;
const TICK_SEC = 0.2;

/**
 * Hero 右下角的 AI 状态条（《品牌与产品设计说明》§2.2 悬浮 pill + §3 屏三流水线语言）：
 * pill 里循环「阶段 1 / 4 → 4 / 4」，下方一行等宽小字给出当前阶段说明与预计剩余耗时，
 * 与 App 内 AI 规划弹层看到的内容同源。
 */
export function HeroAiStatus() {
  const reduced = usePrefersReducedMotion();
  const [elapsed, setElapsed] = useState(10.4);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + TICK_SEC;
        return next >= LOOP_SEC ? 0 : Number(next.toFixed(2));
      });
    }, TICK_SEC * 1000);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const phase = phaseForElapsed(elapsed * SPEED);
  const stage = stageIndexOf(phase) + 1;
  const eta = getEtaLabel(phase, elapsed * SPEED);

  return (
    <div className="absolute -bottom-4 -left-[34px] flex flex-col items-start gap-[7px]">
      <AiPill label="AI 正在生成计划" stage={`阶段 ${stage} / 4`} />
      <Mono className="pl-1 text-[10.5px] text-text-3">
        {PHASE_LABELS[phase]}
        {eta ? ` · ${eta}` : ""}
      </Mono>
    </div>
  );
}
