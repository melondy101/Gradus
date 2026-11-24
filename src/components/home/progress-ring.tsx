"use client";

/**
 * 里程环 —— 天梯总进度用 86px，其它位置默认 52px。
 * SVG 描边需要真实色值，统一走设计令牌表达式（品牌 §1.2），不写裸色值。
 */
import { T } from "@/lib/design-tokens";

interface Props {
  pct: number;
  label: string;
  /** 外径（px），默认 52 */
  size?: number;
  /** 环色，默认点缀色 */
  color?: string;
}

export function ProgressRing({ pct, label, size = 52, color = T.accent }: Props) {
  const stroke = size >= 80 ? 6 : 4;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={r} fill="none" stroke={T.lineCheck} strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset] duration-[.6s] ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-body-sm font-bold text-ink">
        {label}
      </div>
    </div>
  );
}
