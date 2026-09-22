"use client";

/**
 * 轻提示条状态（5s 自动消失，可带一个「撤销」动作）。
 * z-index 400，不与弹窗阶梯冲突。
 */

import { useCallback, useRef, useState } from "react";

export interface ToastState {
  msg: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, actionLabel?: string, onAction?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ msg, actionLabel, onAction });
    timerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}
