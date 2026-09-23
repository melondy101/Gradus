"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { auth, useEazo } from "@/lib/eazo-shim";
import { isAdminUser } from "@/lib/auth/admin-shared";
import { TIER_CONFIGS, type MembershipTier } from "@/lib/membership/tiers";
import { cn } from "@/utils/utils";
import { AccountCenterModal } from "./account-center-modal";

/** 侧栏账户入口：未登录时打开认证弹层，已登录时进入统一的个人中心。 */
export function UserBadge({ compact = false }: { compact?: boolean }) {
  const user = useEazo((state) => state.auth.user);
  const loading = useEazo((state) => state.auth.loading);
  const [open, setOpen] = useState(false);

  if (loading)
    return (
      <div
        className={cn(
          "animate-pulse rounded-full border border-bd-card bg-cream-light",
          compact ? "h-9 w-9" : "h-9"
        )}
      />
    );

  if (!user) {
    return (
      <button type="button" onClick={() => auth.login("login")} title="登录或注册"
        aria-label="登录或注册"
        className={cn(
          "flex items-center justify-center gap-2 rounded-full border border-bd-card bg-card text-sm font-semibold text-ink shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          compact ? "size-9" : "w-full px-3 py-1.5"
        )}>
        <UserRound className="size-4 text-text-2" aria-hidden="true" />
        {compact ? null : "登录 / 注册"}
      </button>
    );
  }

  const tier = (user.membershipTier || "free") as MembershipTier;
  const tierConfig = TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  const name = user.name ?? user.email ?? user.id;
  const isAdmin = isAdminUser(user);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="打开个人中心"
        title={name}
        className={cn(
          "flex items-center rounded-full border border-bd-card bg-card text-sm shadow-sm transition-[box-shadow,scale] hover:shadow-md active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          compact ? "size-9 justify-center p-0" : "w-full gap-2 p-1 sm:px-2.5 sm:py-1.5"
        )}>
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-black text-accent-ink">
          {name[0]?.toUpperCase() ?? "?"}
        </span>
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-ink">{name}</span>
            <span className="rounded-pill bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent-ink">
              {isAdmin ? "ADMIN" : tierConfig.badge}
            </span>
          </>
        )}
      </button>
      <AccountCenterModal open={open} onClose={() => setOpen(false)}
        onLogout={() => { setOpen(false); void auth.logout(); }} user={user} isAdmin={isAdmin} />
    </>
  );
}
