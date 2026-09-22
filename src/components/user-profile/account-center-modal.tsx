"use client";

import React from "react";
import { Crown, KeyRound, LogOut } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { openMembershipModal } from "@/components/membership/global-membership-modal";
import { useAppTheme } from "@/components/theme/theme-provider";
import { THEMES, type ThemeId } from "@/lib/theme-config";
import type { User } from "@/lib/eazo-shim";
import { TIER_CONFIGS, type MembershipTier } from "@/lib/membership/tiers";

interface AccountCenterModalProps {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  user: User;
  isAdmin: boolean;
}

/** 个人中心：汇集 Profile、Appearance、会员兑换与账户操作，不复制业务逻辑。 */
export function AccountCenterModal({ open, onClose, onLogout, user, isAdmin }: AccountCenterModalProps) {
  const { themeId, setThemeId } = useAppTheme();
  const tier = (user.membershipTier || "free") as MembershipTier;
  const tierConfig = TIER_CONFIGS[tier] || TIER_CONFIGS.free;
  const displayName = user.name ?? user.email ?? "访客";
  const openMembership = (tab: "overview" | "manage") => {
    onClose();
    window.setTimeout(() => openMembershipModal(tab), 0);
  };

  return (
    <Modal open={open} onClose={onClose} title="个人中心" eyebrow="PROFILE · APPEARANCE" width={560} layer="detail">
      <div className="space-y-6">
        <section className="flex items-center gap-3 rounded-card border border-bd-card bg-cream-light p-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-black text-accent-ink">
            {displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-black text-ink">{displayName}</h3>
            <p className="truncate text-xs text-text-2">{user.email ?? "临时学习账户"}</p>
            <span className="mt-1 inline-flex rounded-pill bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-bold text-accent-ink">
              {isAdmin ? "系统管理员" : tierConfig.name}
            </span>
          </div>
        </section>

        <section aria-labelledby="appearance-heading">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 id="appearance-heading" className="text-sm font-black text-ink">Appearance</h3>
            <span className="text-xs text-text-2">选择界面风格</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="界面风格">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const theme = THEMES[id];
              const selected = themeId === id;
              return (
                <button key={id} type="button" onClick={() => setThemeId(id)} aria-pressed={selected}
                  className="rounded-field border p-3 text-left transition-[border-color,scale] duration-150 hover:scale-[1.01] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  style={{ background: theme.soft, borderColor: selected ? theme.accent : theme.border, boxShadow: selected ? `0 0 0 1px ${theme.accent}` : undefined }}>
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: theme.accent }} aria-hidden="true" />
                    <span className="truncate text-xs font-black" style={{ color: theme.ink }}>{theme.nameEn}</span>
                  </span>
                  <span className="mt-1 block truncate text-[10px]" style={{ color: theme.muted }}>{theme.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-label="账户服务" className="overflow-hidden rounded-card border border-bd-card">
          <button type="button" onClick={() => openMembership("overview")}
            className="flex min-h-11 w-full items-center gap-3 border-b border-bd-card px-4 text-left text-sm font-semibold text-ink transition-colors hover:bg-cream-light focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent">
            <Crown size={16} className="shrink-0 text-accent" aria-hidden="true" />
            <span className="flex-1">Membership / 兑换码</span><span className="text-xs font-medium text-text-2">配额与权益</span>
          </button>
          {isAdmin ? (
            <button type="button" onClick={() => openMembership("manage")}
              className="flex min-h-11 w-full items-center gap-3 border-b border-bd-card px-4 text-left text-sm font-semibold text-ink transition-colors hover:bg-cream-light focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent">
              <KeyRound size={16} className="shrink-0 text-warning" aria-hidden="true" />
              <span className="flex-1">激活码管理</span><span className="text-xs font-medium text-text-2">管理员</span>
            </button>
          ) : null}
        </section>

        <button type="button" onClick={onLogout}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-field border border-bd-card text-sm font-semibold text-text-2 transition-colors hover:border-error hover:bg-error-soft hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <LogOut size={16} aria-hidden="true" />退出登录
        </button>
      </div>
    </Modal>
  );
}
