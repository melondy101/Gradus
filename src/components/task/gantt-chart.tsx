"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Subtask } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { GanttBar } from "./gantt-bar";
import { GanttKey } from "./gantt-key";
import { barPlacement, GANTT_COLS, planGanttWindow } from "./gantt-window";
import { buildSubtaskViews, type SubtaskState } from "./subtask-view-model";
import { todayOffsetOf } from "./task-dates";

interface GanttChartProps {
  subtasks: Subtask[];
  totalDays: number;
  animated?: boolean;
  /** 为 true 时在卡头提供收起/展开开关（屏二默认为 false，直接展示） */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** 任务起始日，决定表头星期与日期；缺失时退化为 D1/D2 相对天数 */
  startDate?: string | Date | null;
}

const TRACK = "grid grid-cols-[repeat(8,minmax(0,1fr))] gap-1.5";
const COLS: Array<{ state: SubtaskState; label: string }> = [
  { state: "done", label: "已完成" },
  { state: "live", label: "进行中" },
  { state: "plan", label: "计划中" },
];

/**
 * 屏二甘特图：8 列网格，条形以 `--s`（起始列）/ `--c`（跨列数）落位，
 * 三态由真实数据驱动（灰＝已完成、黄＝今天在进行、描边＝计划中）。
 * 表头与行共用同一条标签列（--g-lab），行高 30、条高 21；
 * 竖网格覆盖层用 left:calc(--g-lab+6px) 与行的第二列对齐，故三处必须共用该变量。
 * 窄屏（<640）标签换到轨道上方、轨道通栏，覆盖层随之隐藏——
 * 198px 标签列在这个宽度下必然截断标题，今天这一列改由表头黄底标示。
 */
export function GanttChart({
  subtasks,
  totalDays,
  animated = true,
  collapsible = false,
  defaultOpen = true,
  startDate,
}: GanttChartProps) {
  const [open, setOpen] = useState(defaultOpen);
  if (subtasks.length === 0) return null;

  const todayOffset = todayOffsetOf(startDate);
  const views = buildSubtaskViews(subtasks, startDate, todayOffset);
  const win = planGanttWindow(views, totalDays, startDate, todayOffset);
  const hidden = win.hiddenBefore + win.hiddenAfter;
  const first = win.cols[0];
  const last = win.cols[GANTT_COLS - 1];

  const footParts = [
    `${first.date} – ${last.date}`,
    todayOffset === null ? "未设置起始日期" : win.cols.some((c) => c.isToday) ? "黄底列为今天" : "今天在本窗口之外",
  ];
  if (hidden > 0) footParts.push(`另有 ${hidden} 个子任务在本窗口之外`);

  return (
    <Card className="gap-0">
      <CardHeader>
        <CardTitle>甘特图</CardTitle>
        <CardAction>
          <div className="flex items-center gap-4">
            {COLS.map((c) => (
              <span
                key={c.state}
                className="flex items-center gap-1.5 font-mono text-micro font-medium tracking-[.05em] text-text-2"
              >
                <GanttKey state={c.state} />
                {c.label}
              </span>
            ))}
            {collapsible && (
              <Button
                variant="outline"
                size="xs"
                className="ml-2"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {open ? "收起" : "展开"}
              </Button>
            )}
          </div>
        </CardAction>
      </CardHeader>

      {open && (
        <div className="relative mt-1 [--g-lab:198px]">
          <div className="mb-2 grid grid-cols-[var(--g-lab)_minmax(0,1fr)] items-center gap-1.5 max-sm:mb-1 max-sm:grid-cols-1 max-sm:gap-1">
            <Mono className="flex min-w-0 items-center gap-2 text-text-3">子任务</Mono>
            <div className={TRACK}>
              {win.cols.map((c) => (
                <span
                  key={c.key}
                  title={c.date}
                  className={cn(
                    "rounded-tag py-[5px] font-mono text-micro font-medium tracking-[.05em] text-text-3",
                    c.isToday && "bg-accent font-bold text-ink"
                  )}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className={cn(TRACK, "pointer-events-none absolute inset-y-0 right-0 left-[calc(var(--g-lab)+6px)] max-sm:hidden")}
            >
              {win.cols.map((c) => (
                <span key={c.key} className={c.isToday ? "rounded-chip-sm bg-[rgba(245,197,24,.13)]" : "rounded-chip-sm"} />
              ))}
            </div>

            {views.map((v, i) => {
              const place = barPlacement(v, win);
              const title = `${v.subtask.title} · ${v.schedule} · ${v.durationDays} 天`;
              return (
                <div
                  key={v.subtask.id}
                  className="grid h-[30px] grid-cols-[var(--g-lab)_minmax(0,1fr)] items-center gap-1.5 max-sm:h-auto max-sm:grid-cols-1 max-sm:gap-1 max-sm:pb-3"
                >
                  <span className="flex min-w-0 items-center gap-2" title={title}>
                    <b className="truncate text-body-sm font-medium">{v.subtask.title}</b>
                    {v.bloom && (
                      <em className="shrink-0 font-mono text-[9px] font-medium not-italic text-text-3">
                        {v.bloom.split(" ")[0]}
                      </em>
                    )}
                  </span>
                  <div className={TRACK}>
                    {place && (
                      <GanttBar
                        state={v.state}
                        col={place.col}
                        count={place.count}
                        title={title}
                        animated={animated}
                        delaySec={i * 0.08}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Mono className="mt-3.5 block text-2xs text-text-3">{footParts.join(" · ")}</Mono>
        </div>
      )}
    </Card>
  );
}
