"use client";

import type { Subtask } from "@/lib/db/schema";
import { useTranslation } from "react-i18next";
import { T } from "@/lib/design-tokens";

interface GanttChartProps {
  subtasks: Subtask[];
  totalDays: number;
  animated?: boolean;
  /** When true, wraps the chart in a <details> element (collapsible) */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function GanttChart({
  subtasks,
  totalDays,
  animated = true,
  collapsible = false,
  defaultOpen = true,
}: GanttChartProps) {
  const { t } = useTranslation();
  if (subtasks.length === 0) return null;
  const span = Math.max(totalDays, 1);

  const bars = (
    <div className="flex flex-col gap-[10px]" aria-label={t("gantt.ariaLabel")}>
      {subtasks.map((s, i) => {
        const leftPct = (s.startDay / span) * 100;
        const widthPct = Math.max((s.durationDays / span) * 100, 4);
        const delay = animated ? i * 0.12 : 0;

        return (
          <div
            key={s.id}
            className="relative h-7 rounded-full overflow-hidden"
            style={{ background: T.soft }}
            title={t("gantt.barTitle", { title: s.title, days: s.durationDays })}
          >
            {/* Filled pill segment */}
            <div
              className="absolute inset-y-0 rounded-full"
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                background: T.accent,
                opacity: 0.9,
                transformOrigin: "left",
                animation: animated
                  ? `ganttGrow 0.9s cubic-bezier(.2,.8,.2,1) ${delay}s both`
                  : "none",
              }}
            />
            {/* Label */}
            <em
              className="absolute top-[6px] text-[11px] font-medium not-italic text-white leading-none"
              style={{
                left: `calc(${leftPct}% + 10px)`,
                fontFamily: "var(--font-geist-mono), monospace",
                pointerEvents: "none",
              }}
            >
              {s.title.length > 12 ? `${s.title.slice(0, 10)}…` : s.title}
            </em>
          </div>
        );
      })}
    </div>
  );

  if (!collapsible) return bars;

  return (
    <details
      open={defaultOpen}
      className="border-t"
      style={{ borderColor: T.line, background: T.soft }}
    >
      <summary
        className="px-[18px] py-4 cursor-pointer font-semibold text-[15px] select-none list-none"
        style={{ WebkitListStyle: "none", color: T.ink } as React.CSSProperties}
      >
        {t("gantt.timeline")}
      </summary>
      <div className="px-[18px] pb-[18px]">{bars}</div>
    </details>
  );
}
