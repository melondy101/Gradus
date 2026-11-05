"use client";

/**
 * 拾级天梯（时间色谱 · 视图三，对照 `design-demos/time-chromatics/steps.html`）
 *
 * 结构：眉题 + 衬线标题 + 总里程环｜六级台阶（顶部 8px 层级色）｜左栏当前筛选说明 + 右侧任务清单。
 * 点击台阶按层筛选（再次点击返回全阶）；点击方框完成；点击行打开子任务详情。
 */

import { useState } from "react";
import { PLAN_CHROMATIC } from "@/lib/design-tokens";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/utils/utils";
import { PlanSpectrum } from "./plan-spectrum";
import { ProgressRing } from "./progress-ring";
import { StepLevelTile } from "./step-level-tile";
import { StepsSubtaskCard } from "./steps-subtask-card";
import { LEVEL_COPY, levelGroupsOf, type BloomLevelGroup } from "./steps-level-model";
import type { SubtaskWithTask } from "@/lib/api/tasks";

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
    <div className="min-h-full px-5 py-6 sm:px-8 sm:py-6 max-sm:pb-[calc(84px+env(safe-area-inset-bottom,0px))]">
      <header className="grid gap-6 border-b-2 border-ink pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <Eyebrow>BLOOM&apos;S TAXONOMY / COGNITIVE ATLAS</Eyebrow>
          <h1 className="mt-3 font-chromatic text-display-sm leading-[1.14] tracking-[-.03em] text-ink sm:text-display">
            从识记到创造，
            <br />
            看见自己<span className="text-error">攀到哪一阶。</span>
          </h1>
          <p className="mt-3 max-w-[68ch] font-chromatic text-body leading-relaxed text-text-2">
            六级认知不是六个标签，而是六种不同的学习动作。点击台阶筛选任务，点击方框完成这一阶。
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-chromatic text-display-sm leading-none text-ink">
              {completedTotal}
              <span className="text-title-sm font-normal text-text-2"> / {totalSubtasks} 阶</span>
            </div>
            <div className="mt-2 font-mono text-caption tracking-[.06em] text-text-2">
              已完成 {overallPct}% 攀登里程
            </div>
          </div>
          <ProgressRing
            pct={totalSubtasks > 0 ? completedTotal / totalSubtasks : 0}
            label={`${overallPct}%`}
            size={86}
            color={PLAN_CHROMATIC.vermilion}
          />
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {levelGroups.map((group) => (
          <StepLevelTile
            key={group.level}
            level={group.level}
            name={group.config.name}
            nameEn={group.config.nameEn}
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-max border border-ink px-5 py-5 lg:sticky lg:top-0">
          <Eyebrow>CURRENT LEVEL / 当前筛选</Eyebrow>
          <div className="mt-2 font-chromatic text-display leading-none text-error">
            {selectedBloomLevel === "all" ? "ALL" : `L${selectedBloomLevel}`}
          </div>
          <h2 className="mt-3 font-chromatic text-title-lg leading-tight text-ink">
            {activeLevelData ? activeLevelData.config.name : "全阶任务"}
          </h2>
          <p className="mt-2 text-body leading-relaxed text-text-2">
            {activeLevelData
              ? LEVEL_COPY[activeLevelData.level]
              : "从基础识记到终极创造，把宏大目标拆成一步步攀升的可行阶梯。再次点击已选台阶可返回全部。"}
          </p>
          <div className="mt-4">
            <PlanSpectrum
              levels={selectedBloomLevel === "all" ? undefined : [selectedBloomLevel]}
            />
          </div>
          {selectedBloomLevel !== "all" && (
            <button
              type="button"
              onClick={() => setSelectedBloomLevel("all")}
              className="mt-4 border-b border-ink pb-0.5 text-body-sm text-ink"
            >
              显示全部台阶
            </button>
          )}
        </aside>

        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
            <h2 className="font-chromatic text-title-lg leading-tight text-ink">
              {activeLevelData
                ? `阶梯 ${activeLevelData.level} · ${activeLevelData.config.name}任务`
                : "全阶任务清单"}
            </h2>
            <span className="pb-1 font-mono text-caption text-text-2">
              共 {visibleItems.length} 项 · 点击任务查看详情
            </span>
          </div>

          {totalSubtasks === 0 ? (
            <p
              className={cn(
                "mt-6 border border-dashed border-bd-check px-5 py-10",
                "text-center text-body leading-relaxed text-text-2"
              )}
            >
              还没有可攀的阶梯。先在「今日路线」或顶栏写下一个学习目标，AI 会拆出六级认知台阶。
            </p>
          ) : visibleItems.length === 0 ? (
            <p className="mt-6 border border-dashed border-bd-check px-5 py-10 text-center text-body text-text-2">
              这一阶还没有任务。切换到其它台阶，或显示全部台阶。
            </p>
          ) : (
            <ul className="flex flex-col">
              {visibleItems.map((item) => (
                <StepsSubtaskCard
                  key={item.id}
                  item={item}
                  onToggle={onToggleSubtask}
                  onSelect={onSelectSubtask}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
