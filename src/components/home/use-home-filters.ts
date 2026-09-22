"use client";

/**
 * 今日面板的展示过滤：仅待完成（localStorage: gradus_today_filter_pending）+ 标签筛选。
 * 输出「展示用」的分组与扁平行，供键盘导航与三个视图共用同一份过滤结果。
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import type { TimelineSection } from "./timeline-sections";

const FILTER_STORAGE_KEY = "gradus_today_filter_pending";

export function useHomeFilters(sections: TimelineSection[], tasksList: TaskWithSubtasks[], subtaskRows: SubtaskWithTask[]) {
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(FILTER_STORAGE_KEY) === "true") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowOnlyPending(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleToggleFilterPending = useCallback((onlyPending: boolean) => {
    setShowOnlyPending(onlyPending);
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, String(onlyPending));
    } catch {
      /* ignore */
    }
  }, []);

  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasksList) {
      for (const tag of parseTaskTags(task.tags)) counts[tag] = (counts[tag] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasksList]);

  const displayedSections = useMemo(
    () =>
      sections.map((sec) => ({
        ...sec,
        rows: sec.rows.filter((r) => {
          if (showOnlyPending && r.completed) return false;
          if (selectedTag && !parseTaskTags(r.taskTags).includes(selectedTag)) return false;
          return true;
        }),
      })),
    [sections, showOnlyPending, selectedTag]
  );

  const displayedFlatRows = useMemo(() => displayedSections.flatMap((s) => s.rows), [displayedSections]);

  const displayedTasksList = useMemo(
    () => (selectedTag ? tasksList.filter((t) => parseTaskTags(t.tags).includes(selectedTag)) : tasksList),
    [tasksList, selectedTag]
  );

  const displayedSubtaskRows = useMemo(
    () => (selectedTag ? subtaskRows.filter((r) => parseTaskTags(r.taskTags).includes(selectedTag)) : subtaskRows),
    [subtaskRows, selectedTag]
  );

  return {
    showOnlyPending,
    selectedTag,
    setSelectedTag,
    handleToggleFilterPending,
    availableTags,
    displayedSections,
    displayedFlatRows,
    displayedTasksList,
    displayedSubtaskRows,
  };
}
