import { cn } from "@/utils/utils";

/**
 * 示例 chips —— 设计说明 §1.4：胶囊、奶油浅底、细描边。
 * 悬停时抬升 1px 并转白底墨边，是全站唯一的轻量反馈语言。
 */
export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export function Chip({ className, selected, type, ...props }: ChipProps) {
  return (
    <button
      data-slot="chip"
      type={type ?? "button"}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-[6px] rounded-pill px-[14px] py-[7px] text-[13px] leading-[1.6]",
        "border bg-cream-light text-text-2",
        "transition-[border-color,color,background,transform] duration-[.16s] ease-out",
        "hover:-translate-y-px hover:border-ink hover:bg-white hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected && "border-ink bg-ink text-cream hover:bg-black hover:text-cream",
        className
      )}
      {...props}
    />
  );
}

/** chips 容器：允许换行，默认 8px 间距 */
export function ChipRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)} {...props} />
  );
}
