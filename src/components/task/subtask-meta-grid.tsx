"use client";

import { Eyebrow } from "@/components/ui/eyebrow";
import { totalHoursOf } from "@/lib/workload";
import type { SubtaskView } from "./subtask-view-model";

interface SubtaskMetaGridProps {
  view: SubtaskView;
}

/**
 * 详情面板的 2×2 元信息：认知层级 / 每日深工作时长 / 排期 / 时长。
 * 1px 描边网格由 gap + 同色底拼出，四项都是子任务的真实字段，
 * 缺失时明确写「未标注 / 未估算」，不编造。
 *
 * 工时口径（FB-02）：deep_work_hours 是**每日**深度专注时长，
 * 这里同时给出每日值与该子任务的总计，避免被读成两种不同的数。
 */
export function SubtaskMetaGrid({ view }: SubtaskMetaGridProps) {
  const daily = view.deepWorkHours;
  const cells: { label: string; value: string }[] = [
    { label: "认知层级", value: view.bloom ? `Bloom ${view.bloom}` : "未标注" },
    {
      label: "每日深工时",
      value: daily
        ? `${daily} 小时/天 · 合计 ${totalHoursOf({ durationDays: view.durationDays, deepWorkHours: daily })} 小时`
        : "未估算",
    },
    { label: "排期", value: view.schedule },
    { label: "时长", value: `${view.durationDays} 天` },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-field border border-bd-card bg-bd-card">
      {cells.map((c) => (
        <div key={c.label} className="bg-cream-light px-[14px] py-3">
          <Eyebrow kind="label" className="mb-1.5">
            {c.label}
          </Eyebrow>
          <b className="text-body font-bold">{c.value}</b>
        </div>
      ))}
    </div>
  );
}
