import { PLAN_CHROMATIC_COLORS } from "@/lib/design-tokens";
import { addDays, toDate } from "@/lib/dates";
import type { TaskWithSubtasks } from "@/lib/api/tasks";
import { fmtShortDate, planRangeLabel } from "@/components/task/task-dates";

function accentFor(taskId: string): string {
  const hash = [...taskId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PLAN_CHROMATIC_COLORS[hash % PLAN_CHROMATIC_COLORS.length];
}

export function getPlanViewModel(task: TaskWithSubtasks) {
  const subtasks = task.subtasks || [];
  const total = subtasks.length;
  const completed = subtasks.filter((subtask) => subtask.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isDone = total > 0 && completed === total;
  const totalHours = subtasks.reduce(
    (sum, subtask) => sum + (subtask.deepWorkHours ? Number(subtask.deepWorkHours) || 0 : 0),
    0,
  );
  const nextSubtask = subtasks
    .filter((subtask) => !subtask.completed)
    .sort((a, b) => a.startDay - b.startDay || a.sortOrder - b.sortOrder)[0];
  const start = toDate(task.startDate);
  const nextDate = start && nextSubtask ? addDays(start, nextSubtask.startDay) : null;

  return {
    subtasks,
    total,
    completed,
    pct,
    isDone,
    state: isDone ? "done" as const : completed > 0 ? "live" as const : "plan" as const,
    stateLabel: isDone ? "已完结" : completed > 0 ? "进行中" : "已规划",
    totalHours,
    nextSubtask,
    nextDateLabel: nextDate ? fmtShortDate(nextDate) : "日期待定",
    rangeLabel: planRangeLabel(task.startDate, task.totalDays || 7, task.createdAt),
    accent: accentFor(task.id),
  };
}
