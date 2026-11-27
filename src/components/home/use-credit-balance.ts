"use client";

import { useEffect, useState } from "react";

import { fetchUserMembership } from "@/lib/api/membership";
import { useSessionUser } from "@/lib/auth-shim";

/**
 * AI 规划剩余次数。commerce 未开启或余额未校验时为 null（调用方按「未知」处理，
 * 不拦截提交）；已校验则给出具体次数，0 = 已用完。
 */
export function useCreditBalance(): number | null {
  const user = useSessionUser((s) => s.auth.user);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    fetchUserMembership().then((data) => {
      if (!alive || !data?.commerce?.enabled) return;
      if (!data.commerce.balanceVerified) return;
      setBalance(data.commerce.balance);
    });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  return balance;
}
