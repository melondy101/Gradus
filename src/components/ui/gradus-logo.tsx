import { cn } from "@/utils/utils";

interface GradusLogoProps {
  /** 标识高度（px）。设计稿规定最小 26px 宽（侧边栏）、最大 40px（Footer）。 */
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  /** 深色底反白：两级台阶由 currentColor 驱动，顶点始终点缀黄。 */
  onDark?: boolean;
}

/**
 * 拾级 Gradus 三级台阶标识（《品牌与产品设计说明》§1.1）。
 * 顶点一级用全站唯一点缀黄 —— 标识即色彩系统的缩影。
 */
export function GradusLogo({
  size = 22,
  className,
  showText = false,
  textClassName,
  onDark = false,
}: GradusLogoProps) {
  const height = size;
  const width = Math.round((height * 96) / 44);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[9px] leading-none",
        onDark ? "text-[color:var(--on-dark)]" : "text-[color:var(--ink)]",
        className
      )}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 96 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="0" y="32" width="26" height="12" rx="4" fill="currentColor" />
        <rect x="35" y="18" width="26" height="26" rx="4" fill="currentColor" />
        <rect x="70" y="0" width="26" height="44" rx="4" fill="var(--accent)" />
      </svg>
      {showText ? (
        <span className={cn("flex items-baseline gap-[10px]", textClassName)}>
          <b className="text-[17px] font-black tracking-[.02em]">拾级</b>
          <span className="font-mono text-[10px] font-medium tracking-[.24em] opacity-60">
            GRADUS
          </span>
        </span>
      ) : null}
    </span>
  );
}
