import { getUserById, updateUser } from "@/lib/db/queries/users";
import {
  getRedemptionCodeByCode,
  hasUserRedeemedCode,
  recordRedemption,
} from "@/lib/db/queries/membership";
import { TIER_CONFIGS, type MembershipTier } from "./tiers";

export interface RedeemResult {
  ok: boolean;
  error?: string;
  message?: string;
  tier?: MembershipTier;
  tierName?: string;
  durationDays?: number;
  expiresAt?: string;
}

export async function redeemMembershipCode(
  userId: string,
  rawCode: string
): Promise<RedeemResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { ok: false, error: "请输入兑换码" };
  }

  const codeObj = await getRedemptionCodeByCode(code);
  if (!codeObj) {
    return { ok: false, error: "无效的兑换码，请检查拼写后重试" };
  }

  // 检查兑换码自身有效期
  if (codeObj.expiresAt && new Date(codeObj.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "该兑换码已过有效期" };
  }

  // 检查兑换次数上限
  if (codeObj.maxUses && codeObj.usedCount >= codeObj.maxUses) {
    return { ok: false, error: "该兑换码已被领完，请使用其他兑换码" };
  }

  // 检查该用户是否已兑换过该兑换码
  const alreadyUsed = await hasUserRedeemedCode(userId, code);
  if (alreadyUsed) {
    return { ok: false, error: "您已兑换过此兑换码，每个兑换码限使用一次" };
  }

  const user = await getUserById(userId);
  if (!user) {
    return { ok: false, error: "用户不存在" };
  }

  const targetTier = (codeObj.tier.toLowerCase() as MembershipTier) || "pro";
  const durationDays = codeObj.durationDays || 30;
  const durationMs = durationDays * 24 * 60 * 60 * 1000;

  let newExpiresAt: Date;

  // 若当前用户已有相同等级且未过期，则在现有到期日基础上顺延；否则从当前时间起算
  if (
    user.membershipTier === targetTier &&
    user.membershipExpiresAt &&
    new Date(user.membershipExpiresAt).getTime() > Date.now()
  ) {
    newExpiresAt = new Date(new Date(user.membershipExpiresAt).getTime() + durationMs);
  } else {
    newExpiresAt = new Date(Date.now() + durationMs);
  }

  // 更新用户会员等级与有效期
  await updateUser(userId, {
    membershipTier: targetTier,
    membershipExpiresAt: newExpiresAt,
  });

  // 记录兑换明细与递增使用计数
  await recordRedemption({
    userId,
    codeId: codeObj.id,
    code,
    tier: targetTier,
    durationDays,
  });

  const tierConfig = TIER_CONFIGS[targetTier];
  const tierName = tierConfig?.name || targetTier.toUpperCase();

  return {
    ok: true,
    tier: targetTier,
    tierName,
    durationDays,
    expiresAt: newExpiresAt.toISOString(),
    message: `兑换成功！已为您开通「${tierName}」${durationDays} 天特权。`,
  };
}
