import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/utils";
import { Eyebrow } from "./eyebrow";

/**
 * 统计卡 —— 设计说明 §3 屏一「统计卡行」：
 * 进行中 / 今日待完成 / 连续学习 / 本周完成率，第四张用强调黄卡。
 * 高度随内容自适应（§5 修复记录：固定 127px 有裁切风险）。
 */
const statVariants = cva(
  "rounded-card border bg-card px-5 py-4 transition-[border-color,box-shadow] duration-[.18s] ease-out",
  {
    variants: {
      tone: {
        base: "border-bd-card text-ink hover:border-bd-check",
        /** 全站唯一点缀黄作底的一次 —— 「稀有=重要」 */
        accent: "border-accent-deep bg-accent text-ink",
        dark: "border-bd-dark bg-band-dark text-on-dark",
      },
    },
    defaultVariants: { tone: "base" },
  }
);

export interface StatProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statVariants> {
  label: string;
  value: React.ReactNode;
  /** 数值单位，如「天」「%」—— 比数值小且弱一级 */
  unit?: string;
  foot?: React.ReactNode;
}

export function Stat({
  className,
  tone,
  label,
  value,
  unit,
  foot,
  ...props
}: StatProps) {
  const faint = tone === "accent" ? "text-ink/70" : "text-text-3";
  return (
    <div data-slot="stat" data-tone={tone} className={cn(statVariants({ tone }), className)} {...props}>
      <Eyebrow kind="label" tone={tone === "dark" ? "accent" : "muted"} className={cn(tone === "accent" && "text-ink/70")}>
        {label}
      </Eyebrow>
      <div data-slot="stat-value" className="text-[28px] leading-[34px] font-black tracking-[-.01em]">
        {value}
        {unit ? (
          <em className={cn("ml-[3px] text-[14px] font-medium not-italic", faint)}>
            {unit}
          </em>
        ) : null}
      </div>
      {foot ? (
        <div className={cn("mt-[7px] text-[12px] leading-[18px]", faint)}>{foot}</div>
      ) : null}
    </div>
  );
}

/** 统计卡行：桌面 4 列，移动 2 列（§6 移动端适配建议） */
export function StatRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3.5 lg:grid-cols-4", className)}
      {...props}
    />
  );
}
