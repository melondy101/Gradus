import { cn } from "@/utils/utils";
import Image from "next/image";

/** 方形图标按钮 —— §1.4 的 radius 12 方圆角 + 白卡细描边 */
export function IconButton({
  className,
  type,
  haspip,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { haspip?: boolean }) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "relative grid h-10 w-10 shrink-0 place-items-center rounded-field",
        "border border-bd-card bg-white text-body-lg text-text-2",
        "transition-[border-color,color,background] duration-[.16s] ease-out",
        "hover:border-ink hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {props.children}
      {haspip ? (
        <span className="absolute right-2 top-2 h-[7px] w-[7px] rounded-full border-2 border-white bg-accent" />
      ) : null}
    </button>
  );
}

/** 墨底反白圆形首字头像 */
export function Avatar({
  className,
  name = "访客",
  size = 34,
  src,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { name?: string; size?: number; src?: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "拾";
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.41) }}
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-ink font-black text-cream",
        className
      )}
      {...props}
    >
      {src ? <Image src={src} alt="" fill unoptimized className="object-cover" /> : initial}
    </span>
  );
}
