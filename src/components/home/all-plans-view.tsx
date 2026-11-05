"use client";

import { Plus } from "lucide-react";
import { T } from "@/lib/design-tokens";
import type { NavView } from "@/components/layout/nav-items";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { PlanCard } from "./plan-card";
import { PlanGridSkeleton } from "./plan-grid-skeleton";
import { PlansIntro } from "./plans-intro";

interface AllPlansViewProps {
  tasks: TaskWithSubtasks[];
  fetching: boolean;
  selectedTag: string | null;
  onClearTag: () => void;
  onSelectTask: (taskId: string) => void;
  onViewPlan: (taskId: string, view: Extract<NavView, "steps" | "timeline">) => void;
  onNewPlan: () => void;
  onDeleteTask?: (task: TaskWithSubtasks) => void;
}

export function AllPlansView({
  tasks,
  fetching,
  selectedTag,
  onClearTag,
  onSelectTask,
  onViewPlan,
  onNewPlan,
  onDeleteTask,
}: AllPlansViewProps) {
  return (
    <div
      className="grid min-h-full grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]"
      style={{ background: T.bg }}
    >
      <PlansIntro tasks={tasks} onNewPlan={onNewPlan} />

      <section className="px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
          <div>
            <Eyebrow>LEARNING PLAN LIBRARY / {String(tasks.length).padStart(2, "0")}</Eyebrow>
            <Heading level={2} className="mt-1.5 font-chromatic text-title-lg leading-tight">
              我的学习计划库
            </Heading>
          </div>
          <span className="text-body-sm text-text-2">点击卡片查看目标详情</span>
        </div>

        {fetching && tasks.length === 0 ? (
          <PlanGridSkeleton />
        ) : tasks.length === 0 ? (
          <Card
            tone="soft"
            className="items-center gap-3 rounded-none border-dashed px-5 py-12 text-center"
            style={{ borderColor: T.lineCheck, background: "transparent" }}
          >
            <Plus size={30} className="text-text-3" aria-hidden="true" />
            <div className="font-chromatic text-title-lg text-ink">
              {selectedTag ? "没有符合当前标签的计划" : "暂无学习计划"}
            </div>
            <div className="max-w-[320px] text-body leading-relaxed text-text-2">
              {selectedTag
                ? `标签「${selectedTag}」下暂无计划，可清除筛选查看全部。`
                : "输入你感兴趣的学习主题或技能，AI 将为你规划科学的认知阶梯与权威资源。"}
            </div>
            {selectedTag ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-none px-4"
                onClick={onClearTag}
              >清除标签筛选</Button>
            ) : (
              <Button
                size="sm"
                variant="default"
                className="rounded-none px-4"
                onClick={onNewPlan}
              >立即创建第一个计划</Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tasks.map((task) => (
              <PlanCard
                key={task.id}
                task={task}
                onOpen={onSelectTask}
                onViewPlan={onViewPlan}
                onDelete={onDeleteTask}
              />
            ))}
            <Card
              tone="soft"
              className="min-h-[280px] items-center justify-center gap-3 rounded-none border-dashed p-6 text-center"
              style={{ borderColor: T.ink, background: "transparent" }}
            >
              <span className="font-chromatic text-display-sm leading-none text-error" aria-hidden="true">
                +
              </span>
              <Heading level={3} className="font-chromatic text-title-lg leading-tight">
                再写下一个目标
              </Heading>
              <p className="max-w-[260px] text-body leading-relaxed text-text-2">
                告诉 AI 你想学会什么。它会生成认知阶梯、真实资源与可以接续的排期。
              </p>
              <Button
                size="sm"
                variant="default"
                className="rounded-none px-4"
                onClick={onNewPlan}
              >开始规划</Button>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
