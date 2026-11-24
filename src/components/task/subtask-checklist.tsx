"use client";

import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Mono } from "@/components/ui/eyebrow";
import { BLOOM_CONFIG, bloomChromatic } from "@/lib/design-tokens";
import { deepHoursOf } from "@/lib/workload";
import { cn } from "@/utils/utils";
import { SubtaskMark } from "./subtask-mark";
import type { SubtaskState, SubtaskView } from "./subtask-view-model";

interface SubtaskChecklistProps {
  views: SubtaskView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** 第二参数为该子任务当前的 completed 值，由页面层取反后乐观提交 */
  onToggle: (id: string, current: boolean) => void;
}

const STATE_LABEL: Record<SubtaskState, string> = {
  done: "已完成",
  live: "进行中",
  plan: "计划中",
};

/**
 * 屏二子任务清单（时间色谱）：认知色轨 + 彩色层级标签 + 每日工时。
 * 点击行选中并填充右侧详情面板，点击圆点本身切换完成状态（保留原有勾选行为）。
 */
export function SubtaskChecklist({
  views,
  selectedId,
  onSelect,
  onToggle,
}: SubtaskChecklistProps) {
  return (
    <Card className="gap-0">
      <CardHeader className="mb-1">
        <CardTitle>子任务清单</CardTitle>
        <CardAction>
          <Mono className="text-micro text-text-3">点击行查看详情</Mono>
        </CardAction>
      </CardHeader>

      <ul className="flex flex-col">
        {views.map((v) => {
          const id = v.subtask.id;
          const selected = selectedId === id;
          const level = Math.min(6, Math.max(1, v.bloomLevel ?? 1));
          const config = BLOOM_CONFIG[level as keyof typeof BLOOM_CONFIG];
          const color = bloomChromatic(level);
          const daily = deepHoursOf({
            durationDays: v.durationDays,
            deepWorkHours: v.deepWorkHours,
          });
          return (
            <li
              key={id}
              className={cn(
                "grid cursor-pointer grid-cols-[8px_20px_minmax(0,1fr)_auto] items-center gap-3",
                "border-t border-bd-card py-[7px] transition-colors duration-[.16s]",
                "first:border-t-0 hover:bg-cream-light",
                selected && "bg-cream-light shadow-[inset_3px_0_0_var(--accent)]",
              )}
            >
              <span className="h-8 w-2" style={{ background: color }} aria-hidden="true" />

              <SubtaskMark
                state={v.state}
                ariaLabel={v.subtask.completed ? "标记为未完成" : "标记为已完成"}
                title={v.subtask.completed ? "撤销完成" : "完成此项"}
                onToggle={() => onToggle(id, v.subtask.completed)}
              >
                {v.subtask.completed ? (
                  <Check size={11} strokeWidth={3.2} />
                ) : null}
              </SubtaskMark>

              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(id)}
                className="min-w-0 text-left"
              >
                <span
                  className={cn(
                    "block truncate text-body-lg leading-[1.4] font-bold",
                    // 窄屏把换行让给标题：20+1fr+排期列在这个宽度下必然截断标题，
                    // 而排期是不可缺的信息，只能牺牲单行。
                    "max-sm:overflow-visible max-sm:whitespace-normal",
                    v.state === "done"
                      ? "text-text-3 line-through decoration-bd-check"
                      : "text-ink"
                  )}
                >
                  {v.subtask.title}
                </span>
                <span className="mt-0.5 block text-body-sm text-text-3">
                  {STATE_LABEL[v.state]} · {v.schedule}
                </span>
              </button>

              <div className="text-right">
                <b className="block text-body-sm font-bold whitespace-nowrap" style={{ color }}>
                  L{level} {config.name}
                </b>
                <Mono className="mt-0.5 block text-micro whitespace-nowrap text-text-3">
                  {daily.hours}h/天
                </Mono>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
