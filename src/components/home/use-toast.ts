"use client";

/**
 * 轻提示条 —— 单一出口适配层：内部直接调 sonner 的 <Toaster>（ui/sonner.tsx 负责品牌深药丸语言）。
 * 保留 showToast(msg, actionLabel?, onAction?) / dismissToast() 旧契约，
 * use-subtask-actions 等调用方零改动。
 */

import { useCallback } from "react";
import { toast } from "sonner";

export function useToast() {
  const showToast = useCallback(
    (msg: string, actionLabel?: string, onAction?: () => void) => {
      const id = toast(msg, {
        action:
          actionLabel && onAction
            ? {
                label: actionLabel,
                onClick: () => {
                  onAction();
                  toast.dismiss(id);
                },
              }
            : undefined,
      });
    },
    [],
  );

  const dismissToast = useCallback(() => {
    toast.dismiss();
  }, []);

  return { showToast, dismissToast };
}
