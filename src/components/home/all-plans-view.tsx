"use client";

import { Crown, Plus } from "lucide-react";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlanCard } from "./plan-card";

interface AllPlansViewProps {
  tasks: TaskWithSubtasks[];
  onSelectTask: (taskId: string) => void;
  onNewPlan: () => void;
  onDeleteTask?: (task: TaskWithSubtasks) => void;
}

export function AllPlansView({
  tasks,
  onSelectTask,
  onNewPlan,
  onDeleteTask,
}: AllPlansViewProps) {
  return (
    <div className="flex flex-col gap-5 px-3.5 pt-4 pb-[calc(84px+env(safe-area-inset-bottom,0px))] sm:px-5 sm:pb-8">
      {/* 头部摘要 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-editorial text-[18px] font-bold text-ink">
            我的学习计划库 ({tasks.length})
          </div>
          <div className="mt-0.5 text-body text-text-2">
            全局接续排期，每个计划皆有独立认知阶梯与推荐资源
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openMembershipModal("overview")}
          >
            <Crown size={14} className="text-warning" />
            会员与容量
          </Button>
          <Button size="sm" variant="accent" onClick={onNewPlan}>
            <Plus size={14} /> 新增学习目标
          </Button>
        </div>
      </div>

      {/* 计划卡片网格 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {tasks.map((task) => (
          <PlanCard
            key={task.id}
            task={task}
            onOpen={onSelectTask}
            onDelete={onDeleteTask}
          />
        ))}

        {tasks.length === 0 && (
          <Card
            className="col-span-full flex-col items-center gap-3 border-dashed !border-bd-check px-5 py-12 text-center"
          >
            <Plus size={30} className="text-text-3" aria-hidden="true" />
            <div className="text-body-lg font-semibold text-ink">暂无学习计划</div>
            <div className="max-w-[320px] text-body text-text-2">
              输入你感兴趣的学习主题或技能，AI 将为你规划科学的认知阶梯与权威资源
            </div>
            <Button size="sm" variant="accent" className="mt-1" onClick={onNewPlan}>
              立即创建第一个计划
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
