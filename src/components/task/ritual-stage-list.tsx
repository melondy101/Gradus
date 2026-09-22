"use client";

import { Tag } from "@/components/ui/badge";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { nodeState, RITUAL_STAGES } from "./ritual-phases";

interface RitualStageListProps {
  phase: string;
}

const STATUS_LABEL = {
  done: "已完成",
  live: "进行中",
  todo: "待办",
} as const;

/**
 * 屏三流水线明细（序号章 + 阶段名 + 说明 + 状态标签）。
 * 设计稿此处列的是「计划中的子任务」，但弹层被 home-page 以
 * `{goal, phase, elapsedSec}` 渲染，拿不到流水线结果，且禁止改签名，
 * 因此列出四个阶段自身的真实进度说明——不塞 mock 数据。
 * 入场逐行抬升沿用 globals.css 的 fadeSlideUp。
 */
export function RitualStageList({ phase }: RitualStageListProps) {
  return (
    <>
      <Eyebrow kind="label">流水线明细</Eyebrow>
      <ul className="flex flex-col gap-1">
        {RITUAL_STAGES.map((stage, i) => {
          const state = nodeState(i, phase);
          return (
            <li
              key={stage.key}
              style={{ animationDelay: `${i * 0.07}s` }}
              className="grid animate-[fadeSlideUp_.34s_ease_forwards] grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 rounded-[11px] border border-bd-card bg-cream-light px-3 py-1.5 opacity-0"
            >
              <span className="grid h-[27px] w-[27px] place-items-center rounded-[8px] border border-bd-card bg-white font-mono text-[11px] font-bold text-text-2">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 items-baseline gap-2.5">
                <b className="truncate text-[13.5px] leading-[1.35] font-bold">{stage.name}</b>
                <Mono className="block truncate text-[9.5px] text-text-3">{stage.desc}</Mono>
              </div>
              <Tag>{STATUS_LABEL[state]}</Tag>
            </li>
          );
        })}
      </ul>
    </>
  );
}
