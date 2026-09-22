import * as React from "react"

import { cn } from "@/utils/utils"

/**
 * 卡片 —— 设计说明 §1.4：白卡或描边深卡，radius 16、1px 细描边、padding 24、
 * 几乎无阴影（层次由「白卡浮于奶油底」产生，不靠投影）。
 */
function Card({
  className,
  size = "default",
  tone = "base",
  ...props
}: React.ComponentProps<"div"> & {
  size?: "default" | "sm"
  tone?: "base" | "dark" | "soft"
}) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-tone={tone}
      className={cn(
        "group/card flex flex-col gap-4 overflow-hidden rounded-card border text-[16px] leading-[1.6]",
        "transition-[border-color,background-color] duration-[.18s] ease-out",
        tone === "base" && "border-bd-card bg-card text-ink",
        tone === "soft" && "border-bd-field bg-cream-light text-ink",
        tone === "dark" && "border-bd-dark bg-band-dark text-on-dark",
        size === "sm" && "gap-3 p-4 has-data-[slot=card-footer]:pb-0",
        size === "default" && "p-6 has-data-[slot=card-footer]:pb-0",
        className
      )}
      {...props}
    />
  )
}

/** 卡头：标题与右侧元信息同基线 —— §1.4 .card__head */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-baseline justify-between gap-3 mb-4 group-data-[size=sm]/card:mb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[17px] leading-snug font-bold group-data-[size=sm]/card:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-text-2", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0 self-start", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("-mx-4 group-data-[size=sm]/card:-mx-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-bd-card px-6 pt-4 -mx-6 -mb-6",
        "group-data-[size=sm]/card:px-4 group-data-[size=sm]/card:-mx-4 group-data-[size=sm]/card:-mb-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
