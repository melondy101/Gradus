"use client";

/**
 * 接续排期（时间色谱 · 视图四，对照 `design-demos/time-chromatics/timeline.html`）
 *
 * 结构：眉题 + 衬线标题 + 窗口区间｜认知层级图例｜14 天色带甘特｜页脚口径。
 * 数据仍取 absoluteStart / absoluteEnd 派生的列下标；短计划补足 14 列，长计划横向滚动不裁切。
 */

import { useCallback, useEffect, useRef } from "react";
import { BLOOM_CONFIG, bloomChromatic } from "@/lib/design-tokens";
import { addDays, diffDays } from "@/lib/dates";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { TimelineGanttRow } from "./timeline-gantt-row";
import { getTimelineDayCount } from "./timeline-window";
import { useGanttDragScroll } from "./use-gantt-drag-scroll";
import { useResponsive } from "./use-responsive";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface TimelineViewProps {
  subtasks: SubtaskWithTask[];
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
}

const BLOOM_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function TimelineView({
  subtasks,
  onSelectSubtask,
  onToggleSubtask,
}: TimelineViewProps) {
  const { scrollRef, scrollProps } = useGanttDragScroll();
  const { isMobile } = useResponsive();
  const labelWidth = isMobile ? 164 : 240;
  const todayCellRef = useRef<HTMLSpanElement>(null);

  // 跨任务排序/布局只消费数据层派生的 absoluteStart/End（相对 startDay 不做跨任务比较）。
  const today0 = startOfDay(new Date());
  const dated = subtasks
    .filter((s) => !!s.absoluteStart)
    .sort((a, b) => {
      const diff = new Date(a.absoluteStart!).getTime() - new Date(b.absoluteStart!).getTime();
      return diff !== 0 ? diff : a.startDay - b.startDay;
    });
  const undated = subtasks.filter((s) => !s.absoluteStart);
  const rows = [...dated, ...undated];

  const windowStart = dated.length ? addDays(new Date(dated[0].absoluteStart!), 0) : today0;
  const maxEnd = dated.reduce(
    (acc, s) => Math.max(acc, s.absoluteEnd ? new Date(s.absoluteEnd).getTime() : 0),
    windowStart.getTime()
  );
  const dayCount = getTimelineDayCount(windowStart, new Date(maxEnd));
  const todayIdx = diffDays(windowStart, today0);
  const daysArray = Array.from({ length: dayCount }, (_, i) => addDays(windowStart, i));
  const rangeLabel = `${monthDay(windowStart)} — ${monthDay(daysArray[daysArray.length - 1])}`;

  const scrollToToday = useCallback(() => {
    todayCellRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, []);

  // 首次进入把今天带到视野中间（只在今天确实落在窗口内时滚动）
  useEffect(() => {
    if (todayIdx < 0 || todayIdx >= dayCount) {
      scrollRef.current?.scrollTo({ left: 0 });
      return;
    }
    todayCellRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [todayIdx, dayCount, scrollRef]);

  return (
    <div className="flex min-h-full flex-col px-5 py-6 sm:px-8 sm:py-6 max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <div className="min-w-0">
          <Eyebrow>GLOBAL TIMELINE / {dayCount} DAYS</Eyebrow>
          <h1 className="mt-3 font-chromatic text-display-sm leading-[1.14] tracking-[-.03em] text-ink sm:text-display">
            所有计划放在一起，
            <br />
            看清<span className="text-error">每一天的安排。</span>
          </h1>
          <p className="mt-3 max-w-[62ch] font-chromatic text-body leading-relaxed text-text-2">
            色条颜色对应认知层级。按住鼠标拖动横向浏览，点击色条查看子任务详情。
          </p>
        </div>

        <div className="text-right">
          <div className="font-chromatic text-title-lg leading-none text-ink">{rangeLabel}</div>
          <div className="mt-2 font-mono text-caption tracking-[.06em] text-text-2">
            {rows.length} 项子任务 · {dayCount} 天
          </div>
          <button
            type="button"
            onClick={scrollToToday}
            className="mt-3 border border-ink px-3 py-1.5 text-body-sm text-ink transition-transform duration-[.16s] ease-out hover:-translate-y-px"
          >
            回到今天
          </button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {BLOOM_LEVELS.map((level) => (
          <span key={level} className="flex items-center gap-1.5 text-caption text-text-2">
            <span
              aria-hidden="true"
              className="size-2.5"
              style={{ background: bloomChromatic(level) }}
            />
            <span className="font-mono">L{level}</span>
            <span>{BLOOM_CONFIG[level].name}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 border border-ink">
        <div
          ref={scrollRef}
          {...scrollProps}
          className="max-h-[62vh] cursor-grab overflow-auto bg-cream-light select-none active:cursor-grabbing"
        >
          <div className="min-w-[1180px]">
            {/* 时间刻度表头 */}
            <div
              className="sticky top-0 z-20 grid border-b border-ink bg-cream"
              style={{ gridTemplateColumns: `${labelWidth}px repeat(${dayCount}, minmax(64px, 1fr))` }}
            >
              <div className="sticky left-0 z-30 border-r border-ink bg-cream px-4 py-3 font-mono text-caption tracking-[.08em] text-text-2">
                任务 / 子任务
              </div>
              {daysArray.map((date, index) => {
                const isToday = index === todayIdx;
                return (
                  <span
                    key={index}
                    ref={isToday ? todayCellRef : undefined}
                    title={date.toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })}
                    className={cn(
                      "border-r border-bd-card px-1 py-2 text-center last:border-r-0",
                      isToday && "text-cream"
                    )}
                    style={isToday ? { background: "var(--error)" } : undefined}
                  >
                    <b className="block font-mono text-caption font-bold">{monthDay(date)}</b>
                    <span className="mt-0.5 block text-micro opacity-70">
                      {isToday ? "今天" : `周${WEEKDAY[date.getDay()]}`}
                    </span>
                  </span>
                );
              })}
            </div>

            {rows.map((item, index) => {
              const startIdx = item.absoluteStart
                ? Math.min(Math.max(diffDays(windowStart, new Date(item.absoluteStart)), 0), dayCount - 1)
                : null;
              const rawDuration = Math.max(item.durationDays, 1);
              const duration =
                startIdx === null ? rawDuration : Math.min(rawDuration, dayCount - startIdx);
              return (
                <TimelineGanttRow
                  key={item.id}
                  item={item}
                  dayCount={dayCount}
                  todayIdx={todayIdx}
                  startIdx={startIdx}
                  duration={duration}
                  zebra={index % 2 !== 0}
                  labelWidth={labelWidth}
                  onSelectSubtask={onSelectSubtask}
                  onToggleSubtask={onToggleSubtask}
                />
              );
            })}

            {subtasks.length === 0 && (
              <p className="px-5 py-12 text-center text-body leading-relaxed text-text-2">
                还没有可以排期的子任务。先在「今日路线」写下一个目标，AI 会把阶梯铺到日历上。
              </p>
            )}
          </div>
        </div>
      </div>

      <footer className="mt-3 flex flex-wrap justify-between gap-3 font-mono text-caption text-text-2">
        <span>
          时间轴 {rows.length} 项子任务 · {dayCount} 天
        </span>
        <span>色条长度 = 持续天数 · 朱砂底纹 = 今天</span>
      </footer>
    </div>
  );
}
