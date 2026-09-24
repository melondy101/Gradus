"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SubtaskWithTask, TaskWithSubtasks } from "@/lib/api/tasks";
import { parseTaskTags } from "@/lib/task-tags";
import {
  buildTimelineSections,
  startOfToday,
  type TimelineSection,
} from "./timeline-sections";
import { computeTodayMetrics, type TodayMetrics } from "./today-metrics";

const FILTER_PENDING_KEY = "gradus_today_filter_pending";

/**
 * 首页展示派生层：标签过滤 + 仅看未完成 + 时间轴分组。
 * 输入一律来自 tasks store 的不可变快照，这里只做纯派生，不持有任何数据副本。
 */
export function useHomeFilters(
  subtaskRows: SubtaskWithTask[],
  tasksList: TaskWithSubtasks[]
) {
  const { t, i18n } = useTranslation();
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(FILTER_PENDING_KEY) === "true") {
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
      localStorage.setItem(FILTER_PENDING_KEY, String(onlyPending));
    } catch {
      /* ignore */
    }
  }, []);

  const clearTag = useCallback(() => setSelectedTag(null), []);

  const sections = buildTimelineSections(subtaskRows, t, i18n.language);
  const todayPendingCount =
    sections.find((s) => s.key === "today")?.rows.filter((r) => !r.completed).length ?? 0;

  const availableTags = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasksList) {
      for (const tag of parseTaskTags(task.tags)) {
        counts[tag] = (counts[tag] || 0) + 1;
      }
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

  const displayedFlatRows = useMemo(
    () => displayedSections.flatMap((s) => s.rows),
    [displayedSections]
  );

  const displayedTasksList = useMemo(() => {
    if (!selectedTag) return tasksList;
    return tasksList.filter((task) => parseTaskTags(task.tags).includes(selectedTag));
  }, [tasksList, selectedTag]);

  const displayedSubtaskRows = useMemo(() => {
    if (!selectedTag) return subtaskRows;
    return subtaskRows.filter((r) => parseTaskTags(r.taskTags).includes(selectedTag));
  }, [subtaskRows, selectedTag]);

  const todaySection: TimelineSection =
    displayedSections.find((sec) => sec.key === "today") ?? {
      key: "today",
      label: "今日",
      sublabel: "",
      accentColor: "var(--accent, #F5C518)",
      rows: [],
    };
  const laterSections = displayedSections.filter((sec) => sec.key !== "today");

  const todayMetrics: TodayMetrics = useMemo(
    () => computeTodayMetrics(todaySection.rows, subtaskRows, startOfToday()),
    [todaySection.rows, subtaskRows]
  );

  return {
    showOnlyPending,
    handleToggleFilterPending,
    selectedTag,
    setSelectedTag,
    clearTag,
    availableTags,
    todayPendingCount,
    displayedFlatRows,
    displayedTasksList,
    displayedSubtaskRows,
    todaySection,
    laterSections,
    todayMetrics,
  };
}

export type HomeFilters = ReturnType<typeof useHomeFilters>;
