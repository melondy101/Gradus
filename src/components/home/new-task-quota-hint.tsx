"use client";

/**
 * 新建目标弹窗里的额度提示（FB-03）
 *
 * 之前用户点「按意见重排」才撞上「AI 规划次数已用完」，第一次生成前没有任何提示。
 * 现在提交前就把「还能生成几次 + 用完怎么办」摆在输入框下面。
 *
 * 首次打开会展开一句完整说明（试用 3 次 / 每天再送 1 次 / 可买次数包），
 * 看过之后只保留一行剩余次数 —— 提示，但不聒噪。
 */

import { useEffect, useState } from "react";

import { fetchUserMembership } from "@/lib/api/membership";
import { useSessionUser } from "@/lib/auth-shim";

const SEEN_KEY = "gradus_quota_hint_seen";

export function NewTaskQuotaHint() {
  const user = useSessionUser((s) => s.auth.user);
  const [balance, setBalance] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetchUserMembership().then((data) => {
      if (!alive || !data?.commerce?.enabled) return;
      if (!data.commerce.balanceVerified) return;
      setBalance(data.commerce.balance);
      let firstTime = false;
      try {
        firstTime = localStorage.getItem(SEEN_KEY) !== "1";
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        firstTime = false;
      }
      setExpanded(firstTime);
    });
    return () => { alive = false; };
  }, [user?.id]);

  if (balance === null) return null;

  return (
    <div className="border border-bd-card bg-cream-light px-3 py-2">
      <p className="text-caption text-text-2">
        还可生成 <b className="font-bold text-ink">{balance}</b> 次完整规划（含重排）
        {expanded && (
          <>
            <br />
            免费额度先用 3 次，用完后每天再送 1 次；也可在会员中心购买次数包（10 次 ¥9.90 / 30 次 ¥24.90）。
          </>
        )}
      </p>
    </div>
  );
}
