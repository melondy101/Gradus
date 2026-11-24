"use client";

/**
 * 可交互的迷你天梯样例（FB-09）
 *
 * 之前落地页的「看看它怎么工作」只是个页内锚点，落到静态的四步说明卡 ——
 * 想先看看别人生成出来长什么样的人没地方看。
 *
 * 这里用静态样例数据做一个能点的天梯：台阶可点（按层筛选）、方框可勾、进度会动。
 * 纯前端，不请求后端 —— 落地页不该为了一个演示去走后端。
 */

import { useState } from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { PLAN_CHROMATIC, T } from "@/lib/design-tokens";
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

const LEVEL_NAMES = ["识记", "理解", "应用", "分析", "评估", "创造"] as const;

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
        <p className="mb-9 max-w-[68ch] text-[16px] leading-[27px] text-text-2">
          一个真实目标的拆解结果：六级认知台阶，每一级都能勾、进度会实时变。
          点台阶可以只看那一阶 —— 这就是拾级在做的事，只是这里用的是静态样例。
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {DEMO_TASKS.map((task) => {
            const active = selectedLevel === task.level;
            const isDone = !!done[task.id];
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setSelectedLevel(active ? null : task.level)}
                aria-pressed={active}
                className={cn(
                  "border border-bd-card bg-white px-3 py-3 text-left transition-colors",
                  active && "border-ink",
                )}
              >
                <span className="block font-mono text-2xs tracking-[.12em] text-text-3">
                  L{task.level} {LEVEL_NAMES[task.level - 1]}
                </span>
                <span className="mt-1 block text-body-sm font-bold text-ink">
                  {isDone ? "已完成" : `${DEMO_TASKS.filter((t) => t.level === task.level).length} 项任务`}
                </span>
                <span className="mt-0.5 block font-mono text-2xs text-text-3">
                  {isDone ? "✓" : "待开始"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-4 border border-bd-card bg-white px-5 py-3">
          <span className="font-chromatic text-[28px] leading-none font-bold text-ink">{pct}%</span>
          <span className="text-body-sm text-text-2">
            已完成 {completed} / {DEMO_TASKS.length} 阶 · 勾一个试试，进度会跳
          </span>
        </div>

        <ul className="mt-4 flex flex-col">
          {visible.map((task) => (
            <li key={task.id} className="flex items-center gap-3 border-b border-bd-card py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={!!done[task.id]}
                onClick={() => setDone((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                aria-label={`标记「${task.title}」完成`}
                className="grid size-[22px] flex-none place-items-center border border-ink text-body-sm font-bold text-ink transition-colors hover:bg-ink hover:text-cream"
                style={done[task.id] ? { background: PLAN_CHROMATIC.vermilion, borderColor: PLAN_CHROMATIC.vermilion, color: T.bg } : undefined}
              >
                {done[task.id] ? "✓" : ""}
              </button>
              <span className={cn("min-w-0 flex-1 text-body font-bold", done[task.id] ? "text-text-3 line-through" : "text-ink")}>
                {task.title}
              </span>
              <span className="flex-none font-mono text-caption text-text-3">
                L{task.level} {LEVEL_NAMES[task.level - 1]} · {task.hours}
              </span>
            </li>
          ))}
        </ul>
      </BandWrap>
    </Band>
  );
}
