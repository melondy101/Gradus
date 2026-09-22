"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { cn } from "@/utils/utils"

/**
 * 弹层 —— 设计说明 §3 屏三：45% 墨色遮罩 + 居中白弹层（radius 20、大投影），
 * 页头 / 可滚动主体 / 底栏三段。替代全站散落的 hand-rolled fixed 对儿。
 */
const Z: Record<string, number> = {
  newTask: 100,
  detail: 200,
  confirm: 300,
  ritual: 350,
  /** 删除确认要压住进行中的 AI 流水线遮罩，否则点了删除就再也够不着 */
  danger: 360,
  milestone: 400,
}

export interface ModalProps
  extends Omit<
    React.DialogHTMLAttributes<HTMLDivElement>,
    "title" | "children"
  > {
  open: boolean
  onClose: () => void
  children?: React.ReactNode
  title?: React.ReactNode
  eyebrow?: React.ReactNode
  icon?: React.ReactNode
  footer?: React.ReactNode
  /** 新目标弹层需要贴边自适应，可关掉默认内边距 */
  bodyClassName?: string
  footerClassName?: string
  width?: number
  height?: number | string
  layer?: keyof typeof Z
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
  ...props
}: ModalProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    panelRef.current?.focus()
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--modal-z)] grid place-items-center p-4"
      style={{ ["--modal-z" as string]: Z[layer] }}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
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
          "relative flex max-h-[calc(100dvh-32px)] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[20px] bg-card",
          "shadow-[0_60px_120px_-30px_rgba(14,13,11,.6)] outline-none",
          "animate-[fadeSlideUp_.24s_cubic-bezier(.16,1,.3,1)_both]",
          className
        )}
      >
        {title ? (
          <div className="flex flex-none items-center gap-3.5 border-b border-bd-card px-6 py-3">
            {icon}
            <div className="min-w-0 flex-1">
              <h3 className="text-[17px] leading-tight font-black">{title}</h3>
              {eyebrow ? (
                <span className="mt-0.5 block font-mono text-[9.5px] text-text-3">
                  {eyebrow}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="grid h-[34px] w-[34px] flex-none place-items-center rounded-field text-text-2 transition-colors hover:bg-cream-light hover:text-ink"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "flex flex-none items-center justify-between gap-4 border-t border-bd-card bg-cream-light px-6 py-3",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  )
}
