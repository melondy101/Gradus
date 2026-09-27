import { useCallback, useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

const DRAG_THRESHOLD_PX = 3;
const KEYBOARD_SCROLL_PX = 240;

interface DragState {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
}

/** 桌面鼠标拖动 + 键盘方向键浏览；触屏仍使用原生横向滑动。 */
export function useGanttDragScroll() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-gantt-interactive]")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) < DRAG_THRESHOLD_PX) return;

    event.currentTarget.scrollLeft = drag.startScrollLeft - delta;
    event.preventDefault();
  }, []);

  const stopDragging = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!direction) return;

    event.currentTarget.scrollBy({ left: direction * KEYBOARD_SCROLL_PX, behavior: "smooth" });
    event.preventDefault();
  }, []);

  return {
    scrollRef,
    scrollProps: {
      "aria-label": "时间甘特图。按住鼠标左键并左右拖动浏览；也可使用左右方向键。",
      onKeyDown,
      onPointerCancel: stopDragging,
      onPointerDown,
      onPointerMove,
      onPointerUp: stopDragging,
      role: "region",
      tabIndex: 0,
    },
  };
}
