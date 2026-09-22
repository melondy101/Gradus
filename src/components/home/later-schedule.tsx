"use client";

/**
 * 屏一「后续排期」区（今日之后的时间桶：明日 / 本周 / 7 天后）。
 * 今日用紧凑的 <SubtaskLine> 行（§3 屏一），后续用信息量更大的 TimelineCard 卡片，
 * 保证屏幕一的层级与旧版「可浏览全部排期」的能力同时成立。
 */

import { Card } from "@/components/ui/card";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import { TimelineCard } from "./timeline-card";
import { TimelineSectionHeader } from "./timeline-section-header";
import type { TimelineSection } from "./timeline-sections";

interface Props {
  sections: TimelineSection[];
  focusedTaskId: string | null;
  activeSubtaskId: string | null;
  highlightedSubtaskId: string | null;
  onOpen: (row: SubtaskWithTask) => void;
  onSelect: (row: SubtaskWithTask) => void;
  onToggle: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onSkip: (row: SubtaskWithTask, e: React.MouseEvent) => void;
  onPostpone: (row: SubtaskWithTask, e: React.MouseEvent) => void;
}

export function LaterSchedule({
  sections, focusedTaskId, activeSubtaskId, highlightedSubtaskId,
  onOpen, onSelect, onToggle, onSkip, onPostpone,
}: Props) {
  const visible = sections.filter((s) => s.key !== "today" && s.rows.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {visible.map((section) => (
        <Card key={section.key} className="gap-0 px-[18px] pt-3.5 pb-4">
          <TimelineSectionHeader
            label={section.label}
            sublabel={section.sublabel}
            tone={section.key}
            pendingCount={section.rows.filter((r) => !r.completed).length}
          />
          <div className="flex flex-col gap-2">
            {section.rows.map((row) => (
              <TimelineCard
                key={row.id}
                row={row}
                isSelected={focusedTaskId === row.taskId}
                isActive={activeSubtaskId === row.id}
                isHighlighted={highlightedSubtaskId === row.id}
                onOpen={() => onOpen(row)}
                onSelect={() => onSelect(row)}
                onToggle={(e) => onToggle(row, e)}
                onSkip={(e) => onSkip(row, e)}
                onPostpone={(e) => onPostpone(row, e)}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
