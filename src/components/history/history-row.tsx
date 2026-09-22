"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Check, Trash2 } from "lucide-react";
import type { TaskWithProgress } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import { Tag } from "@/components/ui/badge";
import { Mono } from "@/components/ui/eyebrow";
import { SubtaskMark } from "@/components/task/subtask-mark";
import { cn } from "@/utils/utils";

interface HistoryRowProps {
  task: TaskWithProgress;
  onDelete: (e: React.MouseEvent) => void;
}

type RowState = "done" | "live" | "plan";

const STATUS_LABEL: Record<RowState, string> = {
  done: "已完成",
  live: "进行中",
  plan: "待规划",
};

/**
 * 历史任务单行：三态圆点 + 标题与进度 + 标签胶囊 + 日期与删除。
 * 状态色只走品牌两色语言：已完成墨底、进行中的标签用点缀黄。
 */
export function HistoryRow({ task, onDelete }: HistoryRowProps) {
  const { t } = useTranslation();
  const pct =
    task.subtaskCount > 0 ? Math.round((task.completedCount / task.subtaskCount) * 100) : 0;
  const state: RowState =
    task.status === "done" ? "done" : task.completedCount > 0 ? "live" : "plan";
  const tags = parseTaskTags(task.tags).slice(0, 2);
  const created = new Date(task.createdAt).toLocaleDateString();

  return (
    <li
      className={cn(
        "grid grid-cols-[22px_minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-bd-card",
        "py-[9px] transition-colors duration-[.16s] first:border-t-0 hover:bg-cream-light"
      )}
    >
      <SubtaskMark state={state}>
        {state === "done" ? <Check size={11} strokeWidth={3.2} /> : null}
      </SubtaskMark>

      <Link href={`/task/${task.id}`} className="min-w-0">
        <span
          className={cn(
            "block truncate text-[14.5px] leading-[1.4] font-bold",
            state === "done" ? "text-text-3 line-through decoration-bd-check" : "text-ink"
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 block text-[12px] text-text-3">
          {task.subtaskCount > 0
            ? t("history.completed", { done: task.completedCount, total: task.subtaskCount })
            : task.totalDays > 0
              ? t("history.days", { count: task.totalDays })
              : "—"}
          {task.subtaskCount > 0 ? ` · ${pct}%` : ""} · {STATUS_LABEL[state]} · {created}
        </span>
      </Link>

      <Tag
        className={cn(
          state === "done" && "border-ink bg-ink text-cream",
          state === "live" && "border-accent-deep bg-accent text-ink"
        )}
      >
        {tags.length > 0 ? tags.join(" · ") : STATUS_LABEL[state]}
      </Tag>

      <Mono className="inline-flex items-center gap-2 text-right text-[10px] text-text-3">
        {created}
        <button
          type="button"
          onClick={onDelete}
          aria-label={t("history.delete", "删除")}
          title={t("history.delete", "删除")}
          className="transition-colors duration-[.16s] hover:text-ink"
        >
          <Trash2 size={13} />
        </button>
      </Mono>
    </li>
  );
}
