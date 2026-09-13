import { request } from "./request";
import type { TierConfig, MembershipTier } from "@/lib/membership/tiers";
import type { UserQuotaSummary } from "@/lib/membership/quota";

export interface MembershipResponse {
  ok: boolean;
  user: {
    id: string;
    name: string;
    email: string;
  };
  membership: UserQuotaSummary;
  tiers: Record<MembershipTier, TierConfig>;
  presetCodes: Array<{
    code: string;
    tierName: string;
    duration: string;
    desc: string;
  }>;
  history?: Array<{
    id: string;
    code: string;
    tier: string;
    durationDays: number;
    redeemedAt: string;
  }>;
}

export async function fetchUserMembership(): Promise<MembershipResponse | null> {
  try {
    const res = await request("/api/user/membership");
    if (!res.ok) return null;
    const json = (await res.json()) as MembershipResponse;
    return json.ok ? json : null;
  } catch {
    return null;
  }
}

export async function redeemCode(code: string): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
  tier?: MembershipTier;
  tierName?: string;
  durationDays?: number;
  expiresAt?: string;
}> {
  try {
    const res = await request("/api/membership/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      message?: string;
      tier?: MembershipTier;
      tierName?: string;
      durationDays?: number;
      expiresAt?: string;
    };
    return json;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "网络异常，兑换失败",
    };
  }
}

export interface ManagedCodeItem {
  id: string;
  code: string;
  tier: "pro" | "premium" | string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  isActive: boolean;
  isExpired: boolean;
  isExhausted: boolean;
}

export interface ManagedCodesResponse {
  ok: boolean;
  codes: ManagedCodeItem[];
  stats: {
    totalCodes: number;
    activeCodes: number;
    totalRedeemedCount: number;
  };
}

export async function fetchManagedCodes(): Promise<ManagedCodesResponse | null> {
  try {
    const res = await request("/api/membership/codes");
    if (!res.ok) return null;
    return (await res.json()) as ManagedCodesResponse;
  } catch {
    return null;
  }
}

export async function generateNewCodes(params: {
  customCode?: string;
  prefix?: string;
  tier?: "pro" | "premium";
  durationDays?: number;
  maxUses?: number;
  count?: number;
  description?: string;
  expiresInDays?: number;
}): Promise<{
  ok: boolean;
  message?: string;
  error?: string;
  codes?: ManagedCodeItem[];
}> {
  try {
    const res = await request("/api/membership/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return (await res.json()) as {
      ok: boolean;
      message?: string;
      error?: string;
      codes?: ManagedCodeItem[];
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "生成失败",
    };
  }
}

export async function deleteManagedCode(code: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await request(`/api/membership/codes?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
    return (await res.json()) as { ok: boolean; error?: string };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "删除失败",
    };
  }
}

