"use client";

import { Card } from "@/components/ui/card";
import { AiPill } from "@/components/ui/ai-pill";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { BrandBackLink } from "./brand-back-link";
import { BrandPageShell } from "./brand-page-shell";
import { DetailNotice } from "./detail-notice";
import { GanttChart } from "./gantt-chart";
import { SubtaskChecklist } from "./subtask-checklist";
import { SubtaskInspector } from "./subtask-inspector";
import { TagEditor } from "./tag-editor";
import { TaskDetailHeader } from "./task-detail-header";
import { TaskProgressCard } from "./task-progress-card";
import { planRangeLabel } from "./task-dates";
import {
  countStates,
  dominantTopic,
  remainingDays,
  type SubtaskView,
} from "./subtask-view-model";

interface TaskDetailScreenProps {
  task: TaskWithSubtasks;
  /** 由 buildSubtaskViews 派生，屏二三个区块共用同一份 */
  views: SubtaskView[];
  todayOffset: number | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
  onToggle: (subtaskId: string, current: boolean) => void;
  onMarkDone: () => void;
  onReopen: () => void;
  onUpdateTags: (tags: string[]) => void;
}

/**
 * 屏二 · 任务详情（§3 屏幕二 `.detail-split`）：主列（页头 / 总体进度 / 甘特 / 清单 / 标签）
 * + 380px 详情面板 + 右下悬浮 AI pill，纯展示、所有账从 task 与 views 派生。
 * 数据侧（读取、乐观更新、鉴权兜底）留在 <TaskDetailPage>，
 * 设计侧在这里，这样同一棵树既能接真库也能被 /task/parity-probe 用固定样例实测。
 */
export function TaskDetailScreen({
  task,
  views,
  todayOffset,
  selectedId,
  onSelect,
  onClear,
  onToggle,
  onMarkDone,
  onReopen,
  onUpdateTags,
}: TaskDetailScreenProps) {
  const states = countStates(views);
  const completedCount = task.subtasks.filter((s) => s.completed).length;
  const totalCount = task.subtasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const topic = dominantTopic(views);
  const selectedView = views.find((v) => v.subtask.id === selectedId) ?? null;

  // §4.5 悬浮 AI pill（屏二右下 26/22，与 .detail-split 的 58px 净空配套）：
  // 报真实的资源核查账，而不是把「阶段 3/4」写死当装饰。
  const resTotals = views.reduce(
    (a, v) => ({ total: a.total + v.resources.length, ok: a.ok + v.verifiedCount }),
    { total: 0, ok: 0 }
  );
  const meta = [
    `${totalCount} 个子任务`,
    planRangeLabel(task.startDate, task.totalDays, task.createdAt),
    topic ? `主题：${topic}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <BrandPageShell railLabel="历史任务" railHref="/history">
      <BrandBackLink href="/app">返回我的任务</BrandBackLink>

      <div className="grid grid-cols-[minmax(0,1fr)_380px] items-start gap-3.5 pb-[58px] max-lg:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-3.5">
          <TaskDetailHeader
            status={task.status}
            title={task.title}
            meta={meta}
            onMarkDone={onMarkDone}
            onReopen={onReopen}
          />

          <TaskProgressCard
            completedCount={completedCount}
            states={states}
            total={totalCount}
            pct={pct}
            remainingDays={remainingDays(views, task.totalDays, todayOffset)}
          />

          <GanttChart
            subtasks={task.subtasks}
            totalDays={task.totalDays}
            startDate={task.startDate}
            animated={false}
            collapsible={false}
            defaultOpen
          />

          {totalCount === 0 ? (
            <DetailNotice
              title="还没有子任务"
              text="回到今日面板让 AI 把这个目标拆成带排期的子任务"
            />
          ) : (
            <SubtaskChecklist
              views={views}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          )}

          <Card>
            <TagEditor
              tags={parseTaskTags(task.tags)}
              onChange={onUpdateTags}
              label="任务分类标签"
            />
          </Card>
        </div>

        <SubtaskInspector view={selectedView} onToggle={onToggle} onClear={onClear} />
      </div>

      {resTotals.total > 0 && (
        <AiPill
          className="fixed right-[26px] bottom-[22px] z-40"
          spinning={false}
          live={resTotals.ok < resTotals.total}
          label={
            resTotals.ok === resTotals.total
              ? "AI 已核查排期与资源"
              : "AI 建议复核未核验资源"
          }
          stage={`${resTotals.ok} / ${resTotals.total}`}
        />
      )}
    </BrandPageShell>
  );
}
