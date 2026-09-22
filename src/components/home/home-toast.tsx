"use client";

/**
 * 轻提示条（§3 屏幕一的 `.toast` 语言：深色带药丸 + 黄勾 + 可选「撤销」动作）。
 * z-index 400，与弹层阶梯一致：不越过指令面板（9999）与新手引导（10000+）。
 */

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ToastState } from "./use-toast";

interface Props {
  toast: ToastState;
  onAction: () => void;
}

export function HomeToast({ toast, onAction }: Props) {
  return (
    <div
      role="status"
      className="fixed bottom-[60px] left-1/2 z-[400] flex max-w-[min(440px,92vw)] -translate-x-1/2 items-center gap-2.5 rounded-pill border border-bd-dark bg-band-dark px-5 py-3 text-[13px] font-bold text-on-dark shadow-[0_22px_46px_-18px_rgba(14,13,11,.6)]"
    >
      <Check size={14} className="shrink-0 text-accent" />
      <span className="min-w-0">{toast.msg}</span>
      {toast.actionLabel && toast.onAction && (
        <Button variant="accent" size="xs" className="shrink-0" onClick={onAction}>
          {toast.actionLabel}
        </Button>
      )}
    </div>
  );
}
