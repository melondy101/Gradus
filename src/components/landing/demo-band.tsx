"use client";

/**
 * 可交互的迷你天梯样例（FB-09）
 *
 * 之前落地页的「看看它怎么工作」只是个页内锚点，落到静态的四步说明卡 ——
 * 想先看看别人生成出来长什么样的人没地方看。
 *
 * 这里用静态样例数据做一个能点的天梯：台阶可点（按层筛选）、方框可勾、进度会动。
 * 纯前端，不请求后端 —— 落地页不该为了一个演示去走后端。
 *
 * 视觉对齐产品内的天梯（<StepLevelTile>）与今日路线行（<SubtaskLine>）：
 * 顶部 8px 认知色带 + 衬线台阶名 + 层级色进度条；任务行带认知色轨与彩色 L 标签。
 */

import { useState } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { BLOOM_CONFIG, bloomChromatic, T } from "@/lib/design-tokens";
import { cn } from "@/utils/utils";

import { Band, bandHeadingClass } from "./band";
import { BandWrap } from "./band-wrap";

interface DemoTask {
  id: string;
  level: number;
  title: string;
  hours: string;
}

const DEMO_TASKS: readonly DemoTask[] = [
  { id: "d1", level: 1, title: "看慕课第一讲，整理术语表", hours: "1.5h/天" },
  { id: "d2", level: 2, title: "用自己的话复述每个核心概念", hours: "1.5h/天" },
  { id: "d3", level: 3, title: "做一次单元测验，订正错题", hours: "2h/天" },
  { id: "d4", level: 4, title: "对比分支学科的差异并举例", hours: "2.5h/天" },
  { id: "d5", level: 5, title: "按标准评价一份同学作业", hours: "2.5h/天" },
  { id: "d6", level: 6, title: "设计演示初稿并试讲一遍", hours: "3h/天" },
];

export function LandingDemoBand() {
  const [done, setDone] = useState<Record<string, boolean>>({ d1: true });
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const completed = DEMO_TASKS.filter((t) => done[t.id]).length;
  const pct = Math.round((completed / DEMO_TASKS.length) * 100);
  const visible = selectedLevel === null
    ? DEMO_TASKS
    : DEMO_TASKS.filter((t) => t.level === selectedLevel);

  return (
    <Band id="sec-demo">
      <BandWrap>
        <Eyebrow>Live Sample</Eyebrow>
        <Heading level={2} spec="sec" className={bandHeadingClass}>
          这就是别人生成出来的东西
        </Heading>
        <p className="mb-8 max-w-[68ch] font-chromatic text-body-lg leading-[27px] text-text-2">
          一个真实目标的拆解结果：六级认知台阶，每一级都能勾、进度会实时变。
          点台阶可以只看那一阶 —— 这就是拾级在做的事，只是这里用的是静态样例。
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {DEMO_TASKS.map((task) => {
            const active = selectedLevel === task.level;
            const config = BLOOM_CONFIG[task.level as keyof typeof BLOOM_CONFIG];
            const color = bloomChromatic(task.level);
            const levelDone = DEMO_TASKS.filter((t) => t.level === task.level && done[t.id]).length;
            const levelTotal = DEMO_TASKS.filter((t) => t.level === task.level).length;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedLevel(active ? null : task.level)}
                aria-pressed={active}
                style={{ borderTopColor: color }}
                className={cn(
                  "border border-bd-card border-t-8 bg-cream-light px-3 py-3 text-left",
                  "transition-[border-color,box-shadow,transform] duration-[.16s] ease-out",
                  active
                    ? "border-ink shadow-[3px_3px_0_var(--ink)]"
                    : "hover:border-ink hover:shadow-[3px_3px_0_var(--bd-check)]",
                )}
              >
                <span className="block font-mono text-2xs tracking-[.12em] text-text-3">
                  L{task.level} {config.nameEn.toUpperCase()}
                </span>
                <span className="mt-2 block font-chromatic text-title-sm leading-none text-ink">
                  {config.name}
                </span>
                <span className="mt-3 block text-body-sm text-text-2">
                  {levelDone} / {levelTotal} 完成
                </span>
                <span className="mt-2 block h-[3px] bg-bd-card" aria-hidden="true">
                  <span
                    className="block h-full transition-[width] duration-[.4s] ease-out"
                    style={{
                      width: `${levelTotal > 0 ? Math.round((levelDone / levelTotal) * 100) : 0}%`,
                      background: color,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-4 border border-bd-card bg-card px-5 py-3">
          <span className="font-chromatic text-display-sm leading-none font-bold text-ink">{pct}%</span>
          <span className="text-body-sm text-text-2">
            已完成 {completed} / {DEMO_TASKS.length} 阶 · 勾一个试试，进度会跳
          </span>
        </div>

        <ul className="mt-4 flex flex-col">
          {visible.map((task) => {
            const color = bloomChromatic(task.level);
            const config = BLOOM_CONFIG[task.level as keyof typeof BLOOM_CONFIG];
            const isDone = !!done[task.id];
            return (
              <li
                key={task.id}
                className="grid grid-cols-[8px_22px_minmax(0,1fr)_auto] items-center gap-3 border-b border-bd-card py-3"
              >
                <span className="h-9 w-2" style={{ background: color }} aria-hidden="true" />
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isDone}
                  onClick={() => setDone((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                  aria-label={`标记「${task.title}」完成`}
                  className="grid size-[22px] flex-none place-items-center border border-ink text-body-sm font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
                  style={isDone ? { background: color, borderColor: color, color: T.bg } : undefined}
                >
                  {isDone ? "✓" : ""}
                </button>
                <span className={cn("min-w-0 flex-1 text-body font-bold", isDone ? "text-text-3 line-through" : "text-ink")}>
                  {task.title}
                </span>
                <span className="flex flex-none flex-col items-end">
                  <b className="text-body-sm font-bold whitespace-nowrap" style={{ color }}>
                    L{task.level} {config.name}
                  </b>
                  <span className="font-mono text-2xs whitespace-nowrap text-text-3">{task.hours}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </BandWrap>
    </Band>
  );
}
