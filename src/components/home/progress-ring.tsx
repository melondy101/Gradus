"use client";

/** 52px 里程环 —— SVG 描边需要真实色值，统一走 T 令牌表达式（品牌 §1.2） */
import { T } from "@/lib/design-tokens";

const R = 22;
const C = 2 * Math.PI * R;

export function ProgressRing({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="relative size-[52px] shrink-0">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={R} fill="none" stroke={T.soft} strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r={R}
          fill="none"
          stroke={T.accent}
          strokeWidth="4"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          className="transition-[stroke-dashoffset] duration-[.6s] ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-caption font-bold text-ink">
        {label}
      </div>
    </div>
  );
}
