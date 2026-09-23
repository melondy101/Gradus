"use client";

import { useEffect, useState } from "react";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Card } from "@/components/ui/card";
import { CheckBox } from "@/components/ui/check-box";
import { Eyebrow, Mono } from "@/components/ui/eyebrow";
import { getTagColor } from "@/lib/task-tags";
import { cn } from "@/utils/utils";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

/** 行三态与复选框 / 甘特条共用设计说明 §3 的同一套语言 */
const ROWS = [
  { state: "done", title: "假名与发音定型", meta: "L1 · 2 天" },
  { state: "live", title: "核心动词变形 40 组", meta: "L3 · 3 天" },
  { state: "todo", title: "敬语与书面表达入门", meta: "L4 · 3 天" },
  { state: "todo", title: "N3 真题模考与复盘", meta: "L5 · 4 天" },
] as const;

/**
 * 甘特条落格沿用 landing.css 的 9 列 × 3 行网格：
 * 原 `--r / --s / --c` 三个自定义属性 → `grid-row` 与 `grid-column: start / span n`。
 * `min-h-[10px]` 是为了让 1fr 行有确定基准 —— 原 `.bar{height:100%}` 在
 * 无固定高度的网格里会坍缩成 0，这里显式补齐设计稿的 10px 条高。
 */
const BARS = [
  { key: "done", cls: "row-start-1 [grid-column:1/span_4] bg-gantt-done" },
  { key: "live", cls: "row-start-2 [grid-column:3/span_4] bg-accent" },
  {
    key: "plan",
    cls: "row-start-3 [grid-column:6/span_3] hairline border-dashed border-bd-check",
  },
] as const;

/** 我的任务：三张计划卡，进度条沿用屏二的黄色「进行中」语言 */
const PLANS = [
  { title: "日语 N3 考试备战", tag: "语言", done: 12, total: 14 },
  { title: "Python 数据分析 30 天", tag: "编程", done: 21, total: 30 },
  { title: "每周精读一篇论文", tag: "阅读", done: 3, total: 12 },
] as const;

/** 拾级天梯：Bloom L1→L6 逐级抬升，顶点一级即全站唯一点缀黄 */
const LADDER = ["识记", "理解", "应用", "分析", "评估", "创造"] as const;

/** Tailwind 无法拼动态类名，阶梯六级配色显式列全（bloom-6 本身就是点缀黄） */
const LADDER_BAR = [
  "bg-bloom-1",
  "bg-bloom-2",
  "bg-bloom-3",
  "bg-bloom-4",
  "bg-bloom-5",
  "bg-bloom-6",
] as const;

/** 甘特视图：7 日表头 + 四条任务条（灰=已完成 / 黄=进行中 / 描边=计划） */
const DAYS = ["D1", "D2", "D3", "D4", "D5", "D6", "D7"];
const TODAY_DAY = 5;
const GANTT_ROWS = [
  { title: "假名与发音定型", start: 1, span: 4, state: "done" },
  { title: "核心动词变形 40 组", start: 3, span: 4, state: "live" },
  { title: "敬语与书面表达入门", start: 6, span: 2, state: "plan" },
  { title: "N3 真题模考与复盘", start: 7, span: 1, state: "plan" },
] as const;

/** 每个视图停留时长：够看清内容，又不至于让访客等太久看完全部四个 */
const HOLD_MS = 4200;

/** 面板共同外壳：撑满整个网格格，四个视图的视觉重心才一致 */
const PANEL = "flex h-full flex-col";
/** 面板脚注：把内容压在上半、摘要钉在下半 */
const FOOTER =
  "mt-auto flex items-center justify-between gap-2 border-t border-dashed border-bd-card pt-2.5";

function TodayPanel() {
  return (
    <div className={PANEL}>
      <Eyebrow kind="label">NEW GOAL</Eyebrow>

      <div className="flex h-[52px] items-center justify-between gap-3 rounded-field border border-bd-field bg-cream-light pr-1.5 pl-4 text-[15px]">
        三个月内通过日语 N3 考试
        <span className="rounded-[9px] bg-ink px-4 py-2.5 text-[13px] font-bold whitespace-nowrap text-cream">
          开始规划
        </span>
      </div>

      <ul className="mt-[18px] flex flex-col gap-0.5">
        {ROWS.map((row) => (
          <li
            key={row.title}
            className="grid grid-cols-[18px_1fr_auto] items-center gap-[11px] border-b border-dashed border-bd-card px-1 py-2.5 last:border-0"
          >
            <CheckBox
              state={row.state}
              size={15}
              tabIndex={-1}
              className="rounded-[4px]"
            />
            <span
              className={cn(
                "text-[13.5px] font-medium",
                row.state === "done" &&
                  "text-text-3 line-through decoration-bd-check",
              )}
            >
              {row.title}
            </span>
            <Mono className="text-[10px] text-text-3">{row.meta}</Mono>
          </li>
        ))}
      </ul>

      <div className="mt-[18px] grid grid-cols-[repeat(9,minmax(0,1fr))] grid-rows-[repeat(3,1fr)] gap-[7px] rounded-[10px] border border-bd-card bg-cream-light p-3">
        {BARS.map((bar) => (
          <span
            key={bar.key}
            className={cn("min-h-[10px] rounded-[5px] bg-transparent", bar.cls)}
          />
        ))}
      </div>
    </div>
  );
}

function PlansPanel() {
  const done = PLANS.reduce((sum, p) => sum + p.done, 0);
  const total = PLANS.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className={PANEL}>
      <Eyebrow kind="label">MY PLANS</Eyebrow>

      {/* flex-1 让三张卡等高撑满剩余高度，与今日面板的疏密节奏对齐 */}
      <ul className="flex flex-1 flex-col gap-[10px]">
        {PLANS.map((plan) => {
          const pct = Math.round((plan.done / plan.total) * 100);
          return (
            <li
              key={plan.title}
              className="flex flex-1 flex-col justify-center rounded-[12px] border border-bd-card bg-cream-light px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-[7px]">
                  <span
                    aria-hidden
                    className="size-[7px] shrink-0 rounded-full"
                    style={{ background: getTagColor(plan.tag) }}
                  />
                  <span className="truncate text-[13px] font-bold">
                    {plan.title}
                  </span>
                </span>
                <Mono className="shrink-0 text-[10px] text-text-3">
                  {plan.done} / {plan.total} 阶
                </Mono>
              </div>

              <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-bd-card">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <Mono className="text-[10px] text-text-3">进行中</Mono>
                <Mono className="text-[10px] font-bold text-ink">{pct}%</Mono>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={FOOTER}>
        <Mono className="text-[10px] text-text-3">
          共 {PLANS.length} 个计划 · 全局接续排期
        </Mono>
        <Mono className="text-[10px] font-bold text-ink">
          {done} / {total} 阶
        </Mono>
      </div>
    </div>
  );
}

function StepsPanel() {
  const done = 9;
  const total = 14;

  return (
    <div className={PANEL}>
      <Eyebrow kind="label">BLOOM LADDER</Eyebrow>

      {/* 条高按 1→1.8→…→5 的权重瓜分剩余高度，所以阶梯永远等高撑满且逐级抬升 */}
      <div className="flex flex-1 items-end gap-[6px]">
        {LADDER.map((name, i) => (
          <div
            key={name}
            className="flex h-full flex-1 flex-col items-center gap-[7px]"
          >
            <span
              className={cn(
                "w-full min-h-[10px] rounded-t-[5px]",
                LADDER_BAR[i],
              )}
              style={{ flex: `${1 + i * 0.8} 1 0` }}
            />
            <Mono className="shrink-0 text-[9px] text-text-3">{name}</Mono>
          </div>
        ))}
      </div>

      <div className={FOOTER}>
        <Mono className="text-[10px] text-text-3">
          L1 识记 → L6 创造 · 当前 L3 应用
        </Mono>
        <Mono className="text-[10px] font-bold text-ink">
          {done} / {total} 阶
        </Mono>
      </div>
    </div>
  );
}

function TimelinePanel() {
  return (
    <div className={PANEL}>
      <Eyebrow kind="label">TIMELINE</Eyebrow>

      <div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-2">
        <Mono className="text-[10px] text-text-3">任务 / 计划</Mono>
        <div className="grid grid-cols-7 gap-[3px]">
          {DAYS.map((day, i) => (
            <span
              key={day}
              className={cn(
                "rounded-[4px] py-[3px] text-center font-mono text-[9px]",
                i + 1 === TODAY_DAY
                  ? "bg-accent font-bold text-ink"
                  : "text-text-3",
              )}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-1 flex-col justify-center gap-[7px]">
        {GANTT_ROWS.map((row) => (
          <div
            key={row.title}
            className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-2"
          >
            <span className="truncate text-[10.5px] font-medium text-text-2">
              {row.title}
            </span>
            <div className="grid grid-cols-7 items-center gap-[3px]">
              {DAYS.map((day, i) => {
                const inBar =
                  i + 1 >= row.start && i + 1 < row.start + row.span;
                return (
                  <span
                    key={day}
                    className={cn(
                      "h-[15px] rounded-[4px]",
                      inBar && row.state === "done" && "bg-gantt-done",
                      inBar && row.state === "live" && "bg-accent",
                      inBar &&
                        row.state === "plan" &&
                        "hairline border-dashed border-bd-check",
                    )}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-[14px]">
        <span className="flex items-center gap-[6px]">
          <i
            aria-hidden
            className="h-[7px] w-[12px] rounded-[3px] bg-gantt-done"
          />
          <Mono className="text-[10px] text-text-3">已完成</Mono>
        </span>
        <span className="flex items-center gap-[6px]">
          <i aria-hidden className="h-[7px] w-[12px] rounded-[3px] bg-accent" />
          <Mono className="text-[10px] text-text-3">进行中</Mono>
        </span>
        <span className="flex items-center gap-[6px]">
          <i
            aria-hidden
            className="hairline h-[7px] w-[12px] rounded-[3px] border-dashed border-bd-check"
          />
          <Mono className="text-[10px] text-text-3">计划中</Mono>
        </span>
      </div>

      <div className={FOOTER}>
        <Mono className="text-[10px] text-text-3">
          今日 D{TODAY_DAY} · 4 条任务并行
        </Mono>
        <Mono className="text-[10px] font-bold text-ink">12 / 36 天</Mono>
      </div>
    </div>
  );
}

const PANELS = {
  today: TodayPanel,
  plans: PlansPanel,
  steps: StepsPanel,
  timeline: TimelinePanel,
} as const;

/**
 * Hero 右侧产品界面 mockup —— 《品牌与产品设计说明》§2.2（原 `.mock*`）：
 * 白卡 + 浏览器条 + 内容区。内容区在侧边栏那四个视图（今日面板 / 我的任务 /
 * 拾级天梯 / 甘特视图）之间循环，一次把产品的四条主线都演示给访客看。
 *
 * 四个面板为什么叠在同一个网格格里：格高取四者最大值，于是切视图时卡片高度
 * 恒定、Hero 不跳；非当前面板靠 opacity 淡出，仍占位所以不参与高度竞争。
 * 纯展示、不可交互，因此整块对辅助技术隐藏，输入行与「开始规划」也都是静态排版。
 */
export function HeroMock({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % NAV_ITEMS.length);
    }, HOLD_MS);
    return () => window.clearInterval(timer);
  }, [reduced]);

  const view = NAV_ITEMS[index];

  return (
    <Card
      aria-hidden="true"
      className={cn(
        "gap-0 p-0 shadow-[0_44px_88px_-34px_rgba(17,17,17,.3)]",
        className,
      )}
    >
      <div className="flex h-[38px] items-center gap-[7px] border-b border-bd-card bg-cream-light px-4">
        <i className="size-[9px] rounded-full bg-bd-check" />
        <i className="size-[9px] rounded-full bg-bd-check" />
        <i className="size-[9px] rounded-full bg-bd-check" />
        <Mono className="ml-3 text-[10px] text-text-3">
          gradus / {view.label}
        </Mono>
      </div>

      <div className="grid p-[22px]">
        {NAV_ITEMS.map((item) => {
          const Panel = PANELS[item.id];
          const active = item.id === view.id;
          return (
            <div
              key={item.id}
              className={cn(
                "[grid-area:1/1] transition-opacity duration-[280ms] ease-[cubic-bezier(.2,.8,.2,1)]",
                active ? "opacity-100" : "opacity-0"
              )}
            >
              <Panel />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
