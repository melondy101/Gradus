import * as React from "react"
import { cn } from "@/utils/utils"

/**
 * 输入 —— 设计说明 §1.4：浅底 #FAF8F3 + 1px 描边 + radius 12；
 * 聚焦时墨色描边 + 黄色外环（focus ring 用点缀黄，全站一致）。
 * `size="lg"` 与 App 内主按钮同高 56。
 * `onDark`：深色带内输入框（页脚订阅等）——白雾底 + 深带描边，聚焦转点缀黄；
 * 代替散落各处的手写深底覆盖（ui-debt S9 / 签字点② 2026-09-26）。
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "default" | "lg"
  invalid?: boolean
  onDark?: boolean
}

export function Input({
  className,
  size = "default",
  invalid,
  onDark,
  ...props
}: InputProps) {
  return (
    <input
      data-slot="input"
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-field border px-4 outline-none",
        onDark
          ? "border-bd-dark bg-on-dark/5 text-on-dark placeholder:text-on-dark-3 focus:border-accent focus:bg-on-dark/10"
          : "border-bd-field bg-cream-light text-ink placeholder:text-text-3 focus:border-ink focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,.28)]",
        "transition-[border-color,background-color,box-shadow] duration-[.16s] ease-out",
        size === "default" && "h-11 text-body-lg",
        size === "lg" && "h-14 text-base",
        invalid && (onDark
          ? "border-error-on-dark focus:border-error-on-dark"
          : "border-error focus:border-error"),
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/** 多行版本：与 Input 同一套描边与焦点语言 */
export function Textarea({
  className,
  invalid,
  ...props
}: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea
      data-slot="textarea"
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-field border border-bd-field bg-cream-light px-4 py-3 text-body-lg leading-[1.6] text-ink outline-none",
        "placeholder:text-text-3 resize-none",
        "transition-[border-color,background-color,box-shadow] duration-[.16s] ease-out",
        "focus:border-ink focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,.28)]",
        invalid && "border-error",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

/** 带图标与快捷键槽的搜索框 —— §3 屏一 .main__search */
export function SearchField({
  className,
  icon,
  trailing,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode
  trailing?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-[250px] items-center gap-2 rounded-field border border-bd-field bg-card px-[13px]",
        "transition-[border-color,box-shadow] duration-[.16s] focus-within:border-ink focus-within:shadow-[0_0_0_3px_rgba(245,197,24,.24)]",
        className
      )}
    >
      {icon ? <span className="text-body-lg text-text-3">{icon}</span> : null}
      <input
        data-slot="search-field"
        className="min-w-0 flex-1 border-0 bg-transparent text-body text-ink outline-none placeholder:text-text-3"
        {...props}
      />
      {trailing}
    </div>
  )
}
