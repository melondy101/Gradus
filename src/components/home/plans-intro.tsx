"use client";

import { Crown, Plus } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { openMembershipModalWithFeedback } from "@/components/membership/global-membership-modal";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Heading } from "@/components/ui/heading";
import { PlanSpectrum } from "./plan-spectrum";
import { getPlanViewModel } from "./plan-view-model";

interface PlansIntroProps {
  tasks: TaskWithSubtasks[];
  onNewPlan: () => void;
}

export function PlansIntro({ tasks, onNewPlan }: PlansIntroProps) {
  const models = tasks.map(getPlanViewModel);
  const activeCount = models.filter((model) => !model.isDone).length;
  const totalSubtasks = models.reduce((sum, model) => sum + model.total, 0);
  const totalHours = models.reduce((sum, model) => sum + model.totalHours, 0);

  return (
    <section className="flex flex-col border-b border-bd-card px-6 py-6 lg:border-r lg:border-b-0 lg:px-8 lg:py-8">
      <div>
        <Eyebrow>EVERY GOAL HAS ITS OWN COLOR</Eyebrow>
        <Heading
          level={1}
          spec="sub"
          className="mt-4 font-chromatic text-display leading-[1.12] tracking-[-.03em] 2xl:text-display-lg"
        >
          每个目标，<br />
          都有自己的<span className="text-error">色。</span>
        </Heading>
        <p className="mt-4 max-w-[34ch] font-chromatic text-body leading-relaxed text-text-2">
          把目标放进同一张色谱，却不混成一条流水线。每个计划都有独立阶梯、资源与下一步。
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-y border-bd-card py-5">
        <div>
          <strong className="block font-chromatic text-display-sm text-ink">
            {String(activeCount).padStart(2, "0")}
          </strong>
          <span className="mt-1 block text-body-sm text-text-2">进行中计划</span>
        </div>
        <div>
          <strong className="block font-chromatic text-display-sm text-ink">
            {String(totalSubtasks).padStart(2, "0")}
          </strong>
          <span className="mt-1 block text-body-sm text-text-2">全部子任务</span>
        </div>
        <div>
          <strong className="block font-chromatic text-display-sm text-ink">
            {totalHours.toFixed(1)}h
          </strong>
          <span className="mt-1 block text-body-sm text-text-2">预计投入</span>
        </div>
      </div>

      <div className="mt-6 max-w-[280px]">
        <PlanSpectrum />
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-8">
        <Button
          size="sm"
          variant="default"
          onClick={onNewPlan}
          className="h-10 rounded-none px-4 text-body-sm"
        >
          <Plus size={14} />新增学习目标
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openMembershipModalWithFeedback("overview")}
          className="h-10 rounded-none px-4 text-body-sm"
        >
          <Crown size={14} />会员与容量
        </Button>
      </div>
    </section>
  );
}
