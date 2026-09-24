"use client";

import { useEffect } from "react";
import type { SubtaskWithTask } from "@/lib/api/tasks";
import type { HomeOverlays } from "./use-home-overlays";

interface HomeHotkeysOpts {
  overlays: HomeOverlays;
  detailSubtask: SubtaskWithTask | null | undefined;
  focusedId: string | null;
  setFocusedId: (v: string | null) => void;
  displayedFlatRows: SubtaskWithTask[];
  subtaskRows: SubtaskWithTask[];
  handleToggleSubtask: (taskId: string, subtaskId: string, current: boolean) => void;
}

/**
 * 首页全局键盘快捷键（审计 §5.4：快捷键入 use-home-hotkeys）。
 * ⌘K 指令面板 / n 新建 / Escape 逐层关闭 / ↑↓ 移动选中 / 空格打卡。
 */
export function useHomeHotkeys(opts: HomeHotkeysOpts) {
  const {
    overlays,
    detailSubtask,
    focusedId,
    setFocusedId,
    displayedFlatRows,
    subtaskRows,
    handleToggleSubtask,
  } = opts;
  const {
    showInput,
    congrats,
    commandPaletteOpen,
    activeSubtaskId,
    setCommandPaletteOpen,
    setShowInput,
    setDetailSubtaskId,
    setActiveSubtaskId,
  } = overlays;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === "n" || e.key === "N") {
        if (!showInput && !detailSubtask && !congrats && !commandPaletteOpen) {
          e.preventDefault();
          setShowInput(true);
        }
      } else if (e.key === "Escape") {
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (detailSubtask) {
          setDetailSubtaskId(null);
        } else if (showInput) {
          setShowInput(false);
        } else if (activeSubtaskId) {
          setActiveSubtaskId(null);
        } else if (focusedId) {
          setFocusedId(null);
        }
      } else if (
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        !showInput &&
        !detailSubtask &&
        !congrats &&
        !commandPaletteOpen
      ) {
        if (displayedFlatRows.length === 0) return;
        e.preventDefault();
        const idx = displayedFlatRows.findIndex((r) => r.id === activeSubtaskId);
        let next: number;
        if (idx === -1) {
          next = e.key === "ArrowDown" ? 0 : displayedFlatRows.length - 1;
        } else {
          next =
            e.key === "ArrowDown"
              ? Math.min(displayedFlatRows.length - 1, idx + 1)
              : Math.max(0, idx - 1);
        }
        const target = displayedFlatRows[next];
        if (target) {
          setActiveSubtaskId(target.id);
          setFocusedId(target.taskId);
          setTimeout(() => {
            document
              .getElementById(`subtask-card-${target.id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 0);
        }
      } else if (e.key === " ") {
        let target = activeSubtaskId ? subtaskRows.find((s) => s.id === activeSubtaskId) : undefined;
        if (!target && focusedId) {
          target = subtaskRows.find((s) => s.taskId === focusedId && !s.completed);
        }
        if (target) {
          e.preventDefault();
          handleToggleSubtask(target.taskId, target.id, target.completed);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showInput,
    detailSubtask,
    congrats,
    focusedId,
    activeSubtaskId,
    displayedFlatRows,
    subtaskRows,
    handleToggleSubtask,
    setFocusedId,
    setCommandPaletteOpen,
    setShowInput,
    setDetailSubtaskId,
    setActiveSubtaskId,
    commandPaletteOpen,
  ]);
}
