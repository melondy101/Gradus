"use client";

import React from "react";
import { UserBadge } from "@/components/user-profile/user-badge";
import { cn } from "@/utils/utils";

/**
 * 侧边栏底部用户卡（§3 共用外壳：avatar + 名字 + 等宽小注）。
 * 身份展示与账号菜单仍由 <UserBadge /> 承担（登录态 / 退出 / 会员中心 / 更新检查），
 * 这里只提供侧边栏语言的卡框：1px 描边 + radius 12 + 沉底（margin-top:auto）。
 * 内部统一认证入口或账户菜单都需要撑满卡片，故用 Tailwind 任意变体做非侵入式拉伸。
 */
export function SideUserCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "mt-auto flex items-center gap-2.5 rounded-field border border-bd-card bg-card px-2.5 py-[11px]",
        "transition-colors duration-[.16s] hover:border-bd-check",
        // 未登录时 UserBadge 渲染统一「登录 / 注册」入口，同样撑满整行
        "[&>div]:w-full [&>div]:min-w-0",
        "[&>div>button]:w-full [&>div>button]:max-w-full"
      )}
      aria-label="账号"
    >
      <UserBadge compact={compact} />
    </div>
  );
}
