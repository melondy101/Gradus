"use client";

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, X, UserPlus, LogIn, Send } from "lucide-react";
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
  const [code, setCode] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [watchaRedirecting, setWatchaRedirecting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [authConfig, setAuthConfig] = useState<{
    watchaEnabled?: boolean;
    emailConfigured?: boolean;
    emailProvider?: "qq" | "smtp" | "mock";
    emailVerificationEnabled?: boolean;
  }>({});
  const dialogRef = useRef<HTMLDivElement>(null);

  // 获取服务端认证配置（是否启用观猹 OAuth 等）
  useEffect(() => {
    if (!open) return;
    fetch("/api/auth/config", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setAuthConfig(data);
      })
      .catch(() => {});
  }, [open]);

  // 倒计时计时器
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // ESC 关闭 modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting && !watchaRedirecting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting, watchaRedirecting]);

  // 点 modal 外部关闭
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        if (!submitting && !watchaRedirecting) onClose();
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose, submitting, watchaRedirecting]);

  if (!open) return null;

  // 发送邮箱验证码
  async function handleSendCode() {
    if (sendingCode || countdown > 0) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error("请先输入邮箱地址");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("请输入正确的邮箱格式");
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, type: "register" }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
        waitSeconds?: number;
        devCode?: string;
      };

      if (!res.ok || !data.ok) {
        toast.error(data.error || "发送验证码失败");
        if (data.waitSeconds) setCountdown(data.waitSeconds);
        return;
      }

      setCountdown(60);
      toast.success(data.message || "验证码已发送至邮箱，请查收");
      if (data.devCode) {
        toast.info(`[开发提示] 模拟验证码：${data.devCode}`);
      }
    } catch (err) {
      console.error("[auth] send code error:", err);
      toast.error("发送网络异常，请稍后再试");
    } finally {
      setSendingCode(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedCode = code.trim();

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
    const isEmailServiceActive = Boolean(authConfig.emailConfigured);
    if (mode === "register" && (isEmailServiceActive || trimmedCode)) {
      if (!trimmedCode) {
        toast.error("请输入 6 位邮箱验证码");
        return;
      }
      if (trimmedCode.length !== 6) {
        toast.error("验证码应为 6 位数字");
        return;
      }
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
          ? { name: trimmedName, email: trimmedEmail, password, code: trimmedCode }
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

  function startWatchaLogin(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (submitting || watchaRedirecting) {
      event.preventDefault();
      return;
    }
    setWatchaRedirecting(true);
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
          disabled={submitting || watchaRedirecting}
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
            <div className="relative flex items-center">
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
            </div>
          </Field>

          {isRegister && (
            <Field label="邮箱验证码" htmlFor="auth-code">
              <div className="flex gap-2">
                <input
                  id="auth-code"
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6 位数字验证码"
                  disabled={submitting}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider outline-none focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sendingCode || countdown > 0 || submitting}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-input bg-muted/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {sendingCode ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                </button>
              </div>
            </Field>
          )}

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

          {/* 观猹 OAuth 快捷登录（仅在服务端检测到配置了 WATCHA_CLIENT_ID 时呈现） */}
          {authConfig.watchaEnabled && (
            <div className="pt-2 space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <span className="relative bg-background px-2 text-[11px] text-muted-foreground">
                  或使用第三方平台
                </span>
              </div>

              <a
                href="/api/auth/oauth/watcha"
                onClick={startWatchaLogin}
                aria-disabled={submitting || watchaRedirecting}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
              >
                {watchaRedirecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Image
                    src="/watcha-logo.svg"
                    alt="观猹"
                    width={20}
                    height={20}
                  />
                )}
                {watchaRedirecting ? "正在前往观猹授权…" : "使用观猹账号快捷登录"}
              </a>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground pt-1">
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
