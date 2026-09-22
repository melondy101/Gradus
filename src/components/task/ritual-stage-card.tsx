"use client";

import { Card } from "@/components/ui/card";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { ProgressBar } from "./progress-bar";
import { progressPct, RITUAL_STAGES, stageIndexOf } from "./ritual-phases";

interface RitualStageCardProps {
  phase: string;
  elapsedSec: number;
}

/**
 * 屏三「当前阶段卡」：眉题 + 百分比 + 黄色进度条 + 阶段说明 + 三项统计。
 * 统计只放组件真实持有的量（阶段序号、流式增量、剩余阶段），
 * 子任务 / 资源 / 校验计数需要流水线结果，本弹层不持有，故不虚构。
 */
export function RitualStageCard({ phase, elapsedSec }: RitualStageCardProps) {
  const index = Math.min(stageIndexOf(phase), RITUAL_STAGES.length - 1);
  const stage = RITUAL_STAGES[index];
  const pct = progressPct(phase, elapsedSec);
  const remaining = Math.max(RITUAL_STAGES.length - index - (phase === "done" ? 0 : 1), 0);

  const stats: Array<{ value: string; label: string }> = [
    { value: `${Math.min(index + 1, RITUAL_STAGES.length)} / ${RITUAL_STAGES.length}`, label: "流水线阶段" },
    { value: `${elapsedSec}`, label: "流式增量" },
    { value: phase === "done" ? "0" : `${remaining}`, label: "剩余阶段" },
  ];

  return (
    <Card tone="soft" className="gap-0 px-[18px] py-3.5">
      <div className="mb-[9px] flex items-baseline justify-between">
        <Eyebrow>
          Stage {index + 1} · {stage.name}
        </Eyebrow>
        <b className="text-[20px] leading-[32px] font-black">{pct}%</b>
      </div>

      <ProgressBar percent={pct} label="当前阶段进度" />

      <p className="mt-[9px] text-[13px] leading-[20px] text-text-2">{stage.desc}</p>

      <div className="mt-[11px] grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-bd-field bg-bd-field">
        {stats.map((s) => (
          <div key={s.label} className="bg-white p-[7px] text-center">
            <b className="block text-[19px] leading-[30px] font-black">{s.value}</b>
            <Mono className="mt-[3px] block text-[9.5px] text-text-3">{s.label}</Mono>
          </div>
        ))}
      </div>
    </Card>
  );
}
