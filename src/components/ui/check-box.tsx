import { cn } from "@/utils/utils"

/**
 * 复选框三态 —— 设计说明 §3：已完成＝深底白勾 / 进行中＝黄描边+脉冲点 / 待开始＝空框。
 * 与甘特条三态、状态徽章共用同一语言，不允许再各写一套。
 */
export type CheckState = "todo" | "live" | "done"

export function CheckBox({
  state = "todo",
  className,
  size = 20,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
  state?: CheckState
  size?: number
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === "done"}
      aria-label={
        state === "done" ? "标记为未完成" : state === "live" ? "开始进行中项" : "标记完成"
      }
      style={{ width: size, height: size }}
      className={cn(
        "grid shrink-0 place-items-center rounded-tag hairline bg-white",
        "transition-[background-color,border-color,transform] duration-[.16s] ease-out active:scale-90",
        state === "todo" && "border-bd-check hover:border-ink",
        state === "live" &&
          "border-accent hover:border-accent-deep",
        state === "done" && "border-ink bg-ink",
        className
      )}
      {...props}
    >
      {state === "done" ? (
        <span className="text-caption leading-none font-black text-cream">✓</span>
      ) : state === "live" ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      ) : null}
    </button>
  )
}

/** 圆形序号标记 —— 屏二子任务清单的 .mk 三态 */
export function CheckMark({
  state = "todo",
  n,
  className,
}: {
  state?: CheckState
  n?: number | string
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid h-5 w-5 shrink-0 place-items-center rounded-full text-caption font-black",
        state === "done" && "bg-ink text-cream",
        state === "live" && "border-2 border-accent bg-white text-ink",
        state === "todo" && "hairline border-bd-check bg-white text-text-3",
        className
      )}
    >
      {state === "done" ? "✓" : state === "live" ? "" : n ?? "·"}
    </span>
  );
}
