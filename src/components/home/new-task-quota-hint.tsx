"use client";

/**
 * 新建目标弹窗里的额度提示（FB-03）
 *
 * 提交前就把「还能生成几次 + 用完怎么办」摆在输入框下面：
 *  · 还有次数：一行剩余次数，首访展开完整说明（试用 3 次 / 每天再送 1 次 / 可买次数包）；
 *  · 次数为 0：切换为耗尽态——朱红警示 + 购物车 + 「购买资源包」直达会员中心购买页签。
 */

import { useState } from "react";
import { ShoppingCart } from "lucide-react";

import { openMembershipModalWithFeedback } from "@/components/membership/global-membership-modal";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "gradus_quota_hint_seen";

interface NewTaskQuotaHintProps {
  /** null = 未知（commerce 未开启/未校验），不渲染 */
  balance: number | null;
}

export function NewTaskQuotaHint({ balance }: NewTaskQuotaHintProps) {
  // 首次打开会展开一句完整说明，看过之后只保留一行剩余次数
  const [expanded] = useState(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) !== "1") {
        localStorage.setItem(SEEN_KEY, "1");
        return true;
      }
    } catch {}
    return false;
  });

  if (balance === null) return null;

  if (balance === 0) {
    return (
      <div className="rounded-field border border-error/30 bg-error-soft px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <ShoppingCart size={13} className="flex-none text-error" />
          <span className="text-caption font-bold text-error">AI 规划次数已用完</span>
        </div>
        <p className="mt-1 text-caption leading-relaxed text-text-2">
          每天东八区 00:00 重置，赠送 1 次；购买资源包可立即继续规划。
        </p>
        <Button
          variant="app"
          size="sm"
          className="mt-2 h-8 gap-1.5 px-3 text-caption"
          onClick={() => openMembershipModalWithFeedback("tiers")}
        >
          <ShoppingCart size={13} />
          购买资源包
        </Button>
      </div>
    );
  }

  return (
    <div className="border border-bd-card bg-cream-light px-3 py-2">
      <p className="text-caption text-text-2">
        还可生成 <b className="font-bold text-ink">{balance}</b> 次完整规划（含重排）
        {expanded && (
          <>
            <br />
            免费额度先用 3 次，用完后每天再送 1 次；也可在会员中心购买次数包（10 次 ¥9.90 / 30 次
            ¥24.90）。
          </>
        )}
      </p>
    </div>
  );
}
