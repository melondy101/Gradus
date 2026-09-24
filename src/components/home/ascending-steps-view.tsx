"use client";

import React, { useState } from "react";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressRing } from "./progress-ring";
import { StepLevelTile } from "./step-level-tile";
import { StepsSubtaskCard } from "./steps-subtask-card";
import { levelGroupsOf, type BloomLevelGroup } from "./steps-level-model";

interface AscendingStepsViewProps {
  subtasks: SubtaskWithTask[];
  onToggleSubtask: (subtask: SubtaskWithTask) => void;
  onSelectSubtask: (subtask: SubtaskWithTask) => void;
}

export function AscendingStepsView({
  subtasks,
  onToggleSubtask,
  onSelectSubtask,
}: AscendingStepsViewProps) {
  const [selectedBloomLevel, setSelectedBloomLevel] = useState<number | "all">("all");

  const levelGroups = levelGroupsOf(subtasks);
  const totalSubtasks = subtasks.length;
  const completedTotal = subtasks.filter((s) => s.completed).length;
  const overallPct = totalSubtasks > 0 ? Math.round((completedTotal / totalSubtasks) * 100) : 0;

  const activeLevelData: BloomLevelGroup | null =
    selectedBloomLevel === "all"
      ? null
      : levelGroups.find((g) => g.level === selectedBloomLevel) ?? null;

  const visibleItems = subtasks.filter(
    (s) => selectedBloomLevel === "all" || (s.bloomLevel || 1) === selectedBloomLevel
  );

  return (
    <div className="flex flex-col gap-5 px-3.5 pt-4 pb-[calc(84px+env(safe-area-inset-bottom,0px))] sm:px-5 sm:pb-8">
      {/* 顶部概览：拾级天梯叙事与总步阶进度 */}
      <Card className="flex-row flex-wrap items-center justify-between gap-4">
        <div className="max-w-[460px]">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-tag bg-accent-soft text-body font-bold text-accent-ink">
              阶
            </span>
            <span className="font-editorial text-[18px] font-bold text-ink">
              拾级天梯 · 认知进阶图谱
            </span>
          </div>
          <p className="m-0 text-body leading-normal text-text-2">
            源自布鲁姆认知目标分类学（Bloom&apos;s Taxonomy），从基础识记到终极创造，将宏大目标化为步步攀升的可行阶梯。
          </p>
        </div>

        {/* 攀登进度指示器 */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[24px] leading-tight font-bold text-accent-ink">
              {completedTotal}{" "}
              <span className="text-[14px] font-normal text-text-2">/ {totalSubtasks} 阶</span>
            </div>
            <div className="mt-1 text-body-sm text-text-2">已完成 {overallPct}% 攀登里程</div>
          </div>
          <ProgressRing pct={totalSubtasks > 0 ? completedTotal / totalSubtasks : 0} label={`${overallPct}%`} />
        </div>
      </Card>

      {/* 认知六级阶梯 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="font-editorial text-[14px] font-semibold text-ink">
            六级台阶全览 (点击台阶可按层筛选)
          </div>
          {selectedBloomLevel !== "all" && (
            <Button
              size="xs"
              variant="ghost"
              className="text-accent-ink"
              onClick={() => setSelectedBloomLevel("all")}
            >
              显示全部台阶 ✕
            </Button>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
          {levelGroups.map((group) => (
            <StepLevelTile
              key={group.level}
              level={group.level}
              name={group.config.name}
              nameEn={group.config.nameEn}
              color={group.config.color}
              bg={group.config.bg}
              border={group.config.border}
              completedCount={group.completedCount}
              totalCount={group.totalCount}
              pct={group.pct}
              selected={selectedBloomLevel === group.level}
              onToggleSelect={() =>
                setSelectedBloomLevel((prev) => (prev === group.level ? "all" : group.level))
              }
            />
          ))}
        </div>
      </div>

      {/* 当前阶梯的子任务列表 */}
      <div className="mt-2 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="font-editorial text-body-lg font-bold text-ink">
            {selectedBloomLevel === "all"
              ? "全阶任务清单"
              : `阶梯 ${selectedBloomLevel} · ${activeLevelData?.config.name}任务清单 (${activeLevelData?.items.length || 0})`}
          </div>
          <span className="hidden text-body-sm text-text-2 sm:inline">
            点击复选框标记完成 · 点击卡片查看资源详情
          </span>
        </div>

        {visibleItems.map((item) => (
          <StepsSubtaskCard
            key={item.id}
            item={item}
            onToggle={onToggleSubtask}
            onSelect={onSelectSubtask}
          />
        ))}

        {totalSubtasks === 0 && (
          <Card className="items-center border-dashed !border-bd-check px-5 py-12 text-center text-body text-text-2">
            暂无学习任务阶梯，请先创建一个学习目标
          </Card>
        )}
      </div>
    </div>
  );
}
