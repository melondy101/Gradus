"use client";

/**
 * 全局键盘映射（§13 交互不变量）：
 *   ⌘K / Ctrl+K 指令面板 · N 新建 · Esc 逐级关闭 · ↑↓ 移动光标 · Space 勾选完成
 */

import { useEffect } from "react";
import type { SubtaskWithTask } from "@/lib/api/tasks";

interface Options {
  inputOpen: boolean;
  modalOpen: boolean;
  paletteOpen: boolean;
  focusedId: string | null;
  activeSubtaskId: string | null;
  displayedRows: SubtaskWithTask[];
  allRows: SubtaskWithTask[];
  onTogglePalette: () => void;
  onNewTask: () => void;
  onEscapeLadder: () => void;
  onMove: (row: SubtaskWithTask) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
}

export function useHomeHotkeys(opts: Options) {
  const {
    inputOpen, modalOpen, paletteOpen, focusedId, activeSubtaskId,
    displayedRows, allRows, onTogglePalette, onNewTask, onEscapeLadder,
    onMove, onToggleSubtask,
  } = opts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onTogglePalette();
      } else if (e.key === "n" || e.key === "N") {
        if (!inputOpen && !modalOpen && !paletteOpen) {
          e.preventDefault();
          onNewTask();
        }
      } else if (e.key === "Escape") {
        onEscapeLadder();
      } else if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        !inputOpen && !modalOpen && !paletteOpen
      ) {
        if (displayedRows.length === 0) return;
        e.preventDefault();
        const idx = displayedRows.findIndex((r) => r.id === activeSubtaskId);
        const last = displayedRows.length - 1;
        const next =
          idx === -1
            ? e.key === "ArrowDown" ? 0 : last
            : e.key === "ArrowDown" ? Math.min(last, idx + 1) : Math.max(0, idx - 1);
        const target = displayedRows[next];
        if (target) {
          onMove(target);
          setTimeout(() => {
            document.getElementById(`subtask-card-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 0);
        }
      } else if (e.key === " ") {
        let row = activeSubtaskId ? allRows.find((s) => s.id === activeSubtaskId) : undefined;
        if (!row && focusedId) row = allRows.find((s) => s.taskId === focusedId && !s.completed);
        if (row) {
          e.preventDefault();
          onToggleSubtask(row.taskId, row.id, row.completed);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    inputOpen, modalOpen, paletteOpen, focusedId, activeSubtaskId, displayedRows, allRows,
    onTogglePalette, onNewTask, onEscapeLadder, onMove, onToggleSubtask,
  ]);
}
