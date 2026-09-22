"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { LogOut, UserRound, X, Crown, Ticket, KeyRound, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auth, useEazo } from "@/lib/eazo-shim";
import type { User } from "@/lib/eazo-shim";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { openAppUpdateModal } from "@/components/update/global-update-modal";
import { CURRENT_APP_VERSION } from "@/lib/version";
import { TIER_CONFIGS, type MembershipTier } from "@/lib/membership/tiers";
import { isAdminUser } from "@/lib/auth/admin-shared";

export function UserBadge() {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = isAdminUser(user);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (loading) {
    return (
      <div className="flex h-9 items-center rounded-full border border-border bg-background px-3 shadow-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    // 未登录：显示"注册 / 登录"按钮，触发全局 AuthModal
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => auth.login("login")}
          className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-shadow hover:shadow-md"
        >
          <UserRound className="h-4 w-4 text-muted-foreground" />
          {t("auth.signIn", "登录")}
        </button>
        <button
          onClick={() => auth.login("register")}
          className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
        >
          {t("auth.signUp", "注册")}
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <BadgeTrigger user={user} isAdmin={isAdmin} onClick={() => setOpen((v: boolean) => !v)} />
      {open && (
        <DropdownPanel user={user} isAdmin={isAdmin} onClose={() => setOpen(false)} userIdLabel={t("auth.userId", "用户 ID")}>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setOpen(false);
                openMembershipModal("overview");
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                <span>会员中心 / 配额</span>
              </div>
              <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                <Ticket className="h-3 w-3" />
                兑换
              </span>
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setOpen(false);
                  openMembershipModal("manage");
                }}
                className="flex w-full items-center justify-between rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>激活码管理后台</span>
                </div>
                <span className="rounded-sm bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-1 font-bold">
                  管理员
                </span>
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false);
                openAppUpdateModal({ manual: true });
              }}
              className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-primary" />
                <span>检查移动端 / 客户端更新</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                v{CURRENT_APP_VERSION}
              </span>
            </button>

            <button
              onClick={async () => {
                setOpen(false);
                await auth.logout();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("auth.signOut", "退出")}
            </button>
          </div>
        </DropdownPanel>
      )}
    </div>
  );
}

function BadgeTrigger({ user, isAdmin, onClick }: { user: User; isAdmin?: boolean; onClick: () => void }) {
  const tier = (user.membershipTier || "free") as MembershipTier;
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-background p-1 sm:px-2.5 sm:py-1.5 text-sm shadow-xs transition-all hover:shadow-sm"
    >
      <Avatar user={user} size={24} />
      <span className="hidden sm:inline max-w-[100px] truncate font-medium text-foreground text-xs">
        {user.name ?? user.email ?? user.id}
      </span>
      {isAdmin ? (
        <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[9px] font-bold font-mono">
          <Crown size={10} /><span className="hidden sm:inline ml-0.5">管理员</span>
        </span>
      ) : (
        <span
          className="rounded-full px-1.5 py-0.2 text-[9px] font-bold font-mono"
          style={{
            backgroundColor:
              tier === "premium"
                ? "var(--warning-soft)"
                : tier === "pro"
                ? "var(--success-soft)"
                : "var(--bd-check)",
            color: config.color,
          }}
        >
          {config.badge}
        </span>
      )}
    </button>
  );
}

function DropdownPanel({
  user,
  isAdmin,
  onClose,
  userIdLabel,
  children,
}: {
  user: User;
  isAdmin?: boolean;
  onClose: () => void;
  userIdLabel: string;
  children?: ReactNode;
}) {
  const tier = (user.membershipTier || "free") as MembershipTier;
  const config = TIER_CONFIGS[tier] || TIER_CONFIGS.free;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
      <div className="flex items-start justify-between gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{user.name ?? "—"}</p>
              {isAdmin ? (
                <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[9px] font-bold font-mono">
                  管理员
                </span>
              ) : (
                <span
                  className="rounded-full px-1.5 py-0.2 text-[9px] font-bold font-mono"
                  style={{
                    backgroundColor:
                      tier === "premium"
                        ? "var(--warning-soft)"
                        : tier === "pro"
                        ? "var(--success-soft)"
                        : "var(--bd-check)",
                    color: config.color,
                  }}
                >
                  {config.badge}
                </span>
              )}
            </div>
            {user.email && (
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-0.5 shrink-0 rounded-md p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground space-y-1">
        <Row label="当前身份" value={isAdmin ? "系统管理员" : config.name} />
        <Row label={userIdLabel} value={user.id} mono />
      </div>

      {children && <div className="border-t border-border px-3 py-2">{children}</div>}
    </div>
  );
}

function Avatar({ user, size }: { user: User; size: number }) {
  if (user.avatarUrl) {
    const avatarSrc = user.avatarUrl.startsWith("//")
      ? `https:${user.avatarUrl}`
      : user.avatarUrl;
    return (
      <Image
        src={avatarSrc}
        alt={user.name ?? "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-border"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(user.name ?? user.email ?? "?")[0].toUpperCase()}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground/70">{label}</span>
      <span className={`truncate text-right text-foreground ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
