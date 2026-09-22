import * as React from "react"
import { cn } from "@/utils/utils"

/**
 * 输入 —— 设计说明 §1.4：浅底 #FAF8F3 + 1px 描边 + radius 12；
 * 聚焦时墨色描边 + 黄色外环（focus ring 用点缀黄，全站一致）。
 * `size="lg"` 与 App 内主按钮同高 56。
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: "default" | "lg"
  invalid?: boolean
}

export function Input({
  className,
  size = "default",
  invalid,
  ...props
}: InputProps) {
  return (
    <input
      data-slot="input"
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full rounded-field border border-bd-field bg-cream-light px-4 text-ink outline-none",
        "placeholder:text-text-3",
        "transition-[border-color,background-color,box-shadow] duration-[.16s] ease-out",
        "focus:border-ink focus:bg-white focus:shadow-[0_0_0_3px_rgba(245,197,24,.28)]",
        size === "default" && "h-11 text-[15px]",
        size === "lg" && "h-14 text-base",
        invalid && "border-error focus:border-error",
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
        "w-full rounded-field border border-bd-field bg-cream-light px-4 py-3 text-[15px] leading-[1.6] text-ink outline-none",
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
      {icon ? <span className="text-[15px] text-text-3">{icon}</span> : null}
      <input
        data-slot="search-field"
        className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-text-3"
        {...props}
      />
      {trailing}
    </div>
  )
}
