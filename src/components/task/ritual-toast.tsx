"use client";

interface RitualToastProps {
  text: string;
}

/**
 * 屏三流水线完成提示（设计稿 `.toast`）：深底药丸 + 黄色勾，贴在视口底部居中。
 * 只在流水线真的跑完时由弹层挂载，不预设本组件并未持有的计数。
 */
export function RitualToast({ text }: RitualToastProps) {
  return (
    <div
      role="status"
      className="fixed bottom-[34px] left-1/2 z-[360] flex -translate-x-1/2 items-center gap-[9px] rounded-pill border border-bd-dark bg-band-dark px-5 py-3 text-[13px] font-bold text-on-dark shadow-[0_22px_46px_-18px_rgba(14,13,11,.6)]"
    >
      <span aria-hidden className="font-black text-accent">
        ✓
      </span>
      {text}
    </div>
  );
}
