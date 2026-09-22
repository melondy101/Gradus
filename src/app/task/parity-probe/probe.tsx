"use client";

import { useMemo, useState } from "react";
import { AiGenerationRitualModal } from "@/components/task/ai-generation-ritual-modal";
import { CongratulationsModal } from "@/components/home/congrats-modal";
import { DeletePlanModal } from "@/components/home/delete-plan-modal";
import { MilestoneUnlockModal } from "@/components/home/milestone-unlock-modal";
import { SubtaskDetailModal } from "@/components/home/subtask-detail-modal";
import { TaskDetailScreen } from "@/components/task/task-detail-screen";
import { todayOffsetOf } from "@/components/task/task-dates";
import { buildSubtaskViews } from "@/components/task/subtask-view-model";
import type { Level } from "@/lib/growth";
import { PROBE_TASK } from "./fixture";

const PROBE_LEVEL: Level = { threshold: 20, name: "渐入佳境" };

/**
 * 屏二设计对等探针：用固定样例渲染 <TaskDetailScreen>，
 * 让「必须登录 + 必须有库」才出现的屏二可以被浏览器实测。
 * 所有写操作都是空函数——这里只验版面，不验流程。
 *
 * ?ritual=<phase> 再压上屏三弹层，?overlay=<name> 压上另外三个同样纯展示的浮层：
 * 这几个组件这轮才迁到 <Modal>，遮罩/圆角/投影/底栏按钮此前没有任何检查看得见。
 */
export function TaskDetailProbe({
  ritual,
  overlay,
}: {
  ritual: string | null;
  overlay: string | null;
}) {
  const todayOffset = useMemo(() => todayOffsetOf(PROBE_TASK.startDate), []);
  const views = useMemo(
    () => buildSubtaskViews(PROBE_TASK.subtasks, PROBE_TASK.startDate, todayOffset),
    [todayOffset]
  );
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const fallbackId = (views.find((v) => v.state === "live") ?? views[0])?.subtask.id ?? null;

  // 带大任务上下文的子任务形态：结业卡、详情浮层共用同一份固定样例
  const rows = PROBE_TASK.subtasks.map((s) => ({
    ...s,
    taskTitle: PROBE_TASK.title,
    taskRawInput: PROBE_TASK.rawInput,
    taskTags: PROBE_TASK.tags,
    taskStartDate: PROBE_TASK.startDate?.toISOString() ?? null,
    taskStatus: PROBE_TASK.status,
    taskCreatedAt: PROBE_TASK.createdAt.toISOString(),
  }));
  // probe-2 是唯一带资源与行动项的一条，量起来覆盖最全
  const detailRow = rows.find((r) => r.id === "probe-2") ?? rows[0];

  return (
    <>
      <TaskDetailScreen
        task={PROBE_TASK}
        views={views}
        todayOffset={todayOffset}
        selectedId={pinnedId ?? fallbackId}
        onSelect={setPinnedId}
        onClear={() => setPinnedId(null)}
        onToggle={() => {}}
        onMarkDone={() => {}}
        onReopen={() => {}}
        onUpdateTags={() => {}}
      />

      {ritual && (
        <AiGenerationRitualModal
          goal={PROBE_TASK.rawInput ?? PROBE_TASK.title}
          phase={ritual}
          elapsedSec={ritual === "done" ? 0 : 41}
          onMinimize={() => {}}
          onApply={() => {}}
          onDone={() => {}}
        />
      )}
      {overlay === "delete" && (
        <DeletePlanModal
          isOpen
          taskTitle={PROBE_TASK.title}
          subtaskCount={PROBE_TASK.subtasks.length}
          onConfirm={() => {}}
          onCancel={() => {}}
        />
      )}

      {overlay === "milestone" && (
        <MilestoneUnlockModal level={PROBE_LEVEL} onClose={() => {}} />
      )}

      {overlay === "congrats" && (
        <CongratulationsModal
          data={{ taskTitle: PROBE_TASK.title, taskId: PROBE_TASK.id, subtasks: rows }}
          onClose={() => {}}
          onLearnMore={() => {}}
        />
      )}

      {overlay === "subtask" && (
        <SubtaskDetailModal
          row={detailRow}
          onClose={() => {}}
          onToggle={() => {}}
          onOpenTask={() => {}}
        />
      )}
    </>
  );
}
