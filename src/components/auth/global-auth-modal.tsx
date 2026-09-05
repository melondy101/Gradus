"use client";

import { useState, useEffect } from "react";
import { AuthModal } from "./auth-modal";
import { registerOpenAuth } from "@/lib/eazo-shim";

/**
 * 全局唯一登录/注册弹窗。
 *
 * 挂载到根布局后，任何 `auth.login(mode)` 调用（无论来自 header、task-detail、
 * history 还是未登录提示区）都能打开它，无需每个调用点各自渲染一个弹窗。
 */
export function GlobalAuthModal() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    registerOpenAuth((m) => {
      setMode(m ?? "login");
      setOpen(true);
    });
    return () => registerOpenAuth(null);
  }, []);

  return open ? (
    <AuthModal
      open
      initialMode={mode}
      onClose={() => setOpen(false)}
    />
  ) : null;
}
