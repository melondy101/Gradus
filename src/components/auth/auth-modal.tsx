"use client";

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, X, UserPlus, LogIn } from "lucide-react";
import { auth } from "@/lib/eazo-shim";

type Mode = "login" | "register";

export function AuthModal({
  open,
  initialMode = "login",
  onClose,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // ESC 关闭 modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  // 点 modal 外部关闭
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        if (!submitting) onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, submitting]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail) {
      toast.error("请输入邮箱");
      return;
    }
    if (!password) {
      toast.error("请输入密码");
      return;
    }
    if (mode === "register" && !trimmedName) {
      toast.error("请输入姓名");
      return;
    }
    if (password.length < 6) {
      toast.error("密码至少 6 个字符");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        mode === "register"
          ? { name: trimmedName, email: trimmedEmail, password }
          : { email: trimmedEmail, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 429) {
        toast.error("操作过于频繁，请稍后再试");
        return;
      }

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { id: string; name: string; email: string };
        merged?: boolean;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        toast.error(data.error ?? `${mode === "register" ? "注册" : "登录"}失败`);
        return;
      }

      // 成功 → 刷新客户端 user 状态（避免刷新页面）
      await auth.refresh();

      if (mode === "register") {
        if (data.merged) {
          toast.success("注册成功，已合并临时账号下的任务");
        } else {
          toast.success("注册成功");
        }
      } else {
        toast.success("登录成功");
      }
      onClose();
    } catch (err) {
      console.error("[auth] submit error:", err);
      toast.error("网络异常，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRegister ? "注册账号" : "登录账号"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
      >
        <button
          type="button"
          aria-label="关闭"
          onClick={onClose}
          disabled={submitting}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isRegister ? "创建账号" : "登录"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRegister
              ? "免费注册账号，把临时状态下的学习任务保留下来"
              : "用邮箱和密码登录，继续你的学习计划"}
          </p>
        </div>

        <div className="flex border-b border-border">
          <ModeTab
            active={!isRegister}
            icon={<LogIn className="h-4 w-4" />}
            label="登录"
            onClick={() => setMode("login")}
            disabled={submitting}
          />
          <ModeTab
            active={isRegister}
            icon={<UserPlus className="h-4 w-4" />}
            label="注册"
            onClick={() => setMode("register")}
            disabled={submitting}
          />
        </div>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          {isRegister && (
            <Field label="姓名" htmlFor="auth-name">
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="如何称呼你"
                autoComplete="name"
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 disabled:opacity-60"
              />
            </Field>
          )}

          <Field label="邮箱" htmlFor="auth-email">
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 disabled:opacity-60"
            />
          </Field>

          <Field label="密码" htmlFor="auth-password">
            <div className="relative">
              <input
                id="auth-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder={isRegister ? "至少 6 个字符" : "请输入密码"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 disabled:opacity-60"
              />
              <button
                type="button"
                aria-label={showPwd ? "隐藏密码" : "显示密码"}
                onClick={() => setShowPwd((v: boolean) => !v)}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRegister ? "注册并开始" : "登录"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            {isRegister ? (
              <>
                已有账号？{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  disabled={submitting}
                >
                  直接登录
                </button>
              </>
            ) : (
              <>
                还没有账号？{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  disabled={submitting}
                >
                  免费注册
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  icon,
  label,
  onClick,
  disabled,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors " +
        (active
          ? "border-b-2 border-foreground text-foreground"
          : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {icon}
      {label}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}