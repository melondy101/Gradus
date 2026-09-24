"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/utils/utils";

/**
 * 弹层 —— 全站唯一的弹层基础设施（设计说明 §3 屏三语言）。
 * placement="center"：45% 墨遮罩 + 居中白弹层（radius 20、大投影），页头/可滚动主体/底栏三段。
 * placement="bottom"：同一套遮罩/ESC/焦点/z 阶梯下的移动端底部抽屉变体。
 * busy：提交/跳转进行中标记，屏蔽 ESC 与点遮罩关闭、禁用内置关闭钮。
 */
const Z: Record<string, number> = {
  newTask: 100,
  /** 移动端 AI 抽屉遮罩，落在 new-task(100) 与 detail(200) 之间 */
  drawer: 150,
  detail: 200,
  confirm: 300,
  ritual: 350,
  /** 删除确认要压住进行中的 AI 流水线遮罩，否则点了删除就再也够不着 */
  danger: 360,
  milestone: 400,
};

export interface ModalProps extends Omit<
  React.DialogHTMLAttributes<HTMLDivElement>,
  "title" | "children"
> {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  /** 新目标弹层需要贴边自适应，可关掉默认内边距 */
  bodyClassName?: string;
  footerClassName?: string;
  width?: number | string;
  height?: number | string;
  layer?: keyof typeof Z;
  /** center = 居中白弹层；bottom = 移动端底部抽屉变体（同一套遮罩/ESC/焦点/z 阶梯） */
  placement?: "center" | "bottom";
  /** 提交/跳转进行中：屏蔽 ESC 与点遮罩关闭，禁用内置关闭钮 */
  busy?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  icon,
  footer,
  children,
  className,
  bodyClassName,
  footerClassName,
  width = 720,
  height,
  layer = "detail",
  placement = "center",
  busy = false,
  ...props
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const isBottom = placement === "bottom";

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!busy) onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, busy]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[var(--modal-z)]",
        isBottom
          ? "flex items-end justify-center"
          : "grid place-items-center p-4",
      )}
      style={{ ["--modal-z" as string]: Z[layer] }}
    >
      <div
        aria-hidden="true"
        onClick={busy ? undefined : onClose}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />
      <div
        {...props}
        ref={panelRef}
        role={props.role ?? "dialog"}
        aria-modal="true"
        aria-labelledby={props.id}
        tabIndex={-1}
        style={{ width, height }}
        className={cn(
          "relative flex flex-col overflow-hidden bg-card",
          isBottom
            ? "max-h-[calc(100dvh)] max-w-full rounded-t-[20px] pb-[env(safe-area-inset-bottom,0px)]"
            : "max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] rounded-popover",
          "shadow-[0_60px_120px_-30px_rgba(14,13,11,.6)] outline-none",
          "animate-[fadeSlideUp_.24s_cubic-bezier(.16,1,.3,1)_both]",
          className,
        )}
      >
        {title ? (
          <div className="flex flex-none items-center gap-3.5 border-b border-bd-card px-6 py-3">
            {icon}
            <div className="min-w-0 flex-1">
              <h3 className="text-title-sm leading-tight font-black">{title}</h3>
              {eyebrow ? (
                <span className="mt-0.5 block font-mono text-2xs text-text-3">
                  {eyebrow}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="关闭"
              className="grid h-[34px] w-[34px] flex-none place-items-center rounded-field text-text-2 transition-colors hover:bg-cream-light hover:text-ink disabled:opacity-50"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "flex flex-none items-center justify-between gap-4 border-t border-bd-card bg-cream-light px-6 py-3",
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
