import { getUserById, updateUser, getTasksByUser } from "@/lib/db/queries";
import { type User } from "@/lib/db/schema";
import { isAdminUser } from "@/lib/auth/admin-shared";
import {
  type MembershipTier,
  TIER_CONFIGS,
  type TierConfig,
} from "./tiers";

/**
 * 获取东八区（UTC+8 / Asia/Shanghai）当前日期 "YYYY-MM-DD"
 * 确保每天在东八区 24:00（即次日 00:00）准时刷新各项每日配额
 */
export function getBeijingDateString(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

export function getUserEffectiveTier(user: User | null | undefined): MembershipTier {
  if (!user) return "free";
  // 管理员专属特权：始终享受尊享版顶级配额与全部功能
  if (isAdminUser(user)) {
    return "premium";
  }

  if (!user.membershipTier) return "free";
  const rawTier = user.membershipTier.toLowerCase() as MembershipTier;
  if (rawTier !== "pro" && rawTier !== "premium") {
    return "free";
  }

  // 检查是否过期
  if (user.membershipExpiresAt) {
    const expiresTime = new Date(user.membershipExpiresAt).getTime();
    if (expiresTime > 0 && expiresTime < Date.now()) {
      return "free"; // 已过期降级为 free
    }
  }

  return rawTier;
}

export interface TaskCreationCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  tier: MembershipTier;
  tierConfig: TierConfig;
  reason?: string;
}

/**
 * 校验用户当前任务总数（普通用户最多同时拥有 2 个任务）
 */
export async function checkTaskCreationQuota(userId: string): Promise<TaskCreationCheckResult> {
  const user = await getUserById(userId);
  const tier = getUserEffectiveTier(user);
  const tierConfig = TIER_CONFIGS[tier];
  const userTasks = await getTasksByUser(userId);
  const current = userTasks.length;
  const limit = tierConfig.limits.maxTasks;

  if (current >= limit) {
    const tierName = tierConfig.name;
    const upgradeTip =
      tier === "free"
        ? "普通用户最多同时拥有 2 个学习任务。已达上限，请先完成或删除已有任务，或升级专业版解锁更多任务容量！"
        : `${tierName}最多同时拥有 ${limit} 个学习任务，当前已达上限。`;
    return {
      allowed: false,
      current,
      limit,
      tier,
      tierConfig,
      reason: upgradeTip,
    };
  }

  return {
    allowed: true,
    current,
    limit,
    tier,
    tierConfig,
  };
}

export interface TaskOpCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  tier: MembershipTier;
  tierConfig: TierConfig;
  reason?: string;
}

/**
 * 校验并记录每日「新建 + 删除」任务操作次数（普通用户每日限 5 次）
 */
export async function checkAndIncrementTaskOpQuota(
  userId: string,
  opType: "create" | "delete"
): Promise<TaskOpCheckResult> {
  const user = await getUserById(userId);
  const tier = getUserEffectiveTier(user);
  const tierConfig = TIER_CONFIGS[tier];
  const limit = tierConfig.limits.dailyTaskOpsLimit;
  const todayStr = getBeijingDateString();

  let opsCount = user?.taskOpsCount ?? 0;
  let genCount = user?.aiGenerateCount ?? 0;
  let adjCount = user?.aiAdjustCount ?? 0;

  // 跨天重置（以东八区 24:00 为分界）
  if (!user?.lastUsageDate || user.lastUsageDate !== todayStr) {
    opsCount = 0;
    genCount = 0;
    adjCount = 0;
  }

  if (opsCount >= limit) {
    const opLabel = opType === "create" ? "新建" : "删除";
    const tip =
      tier === "free"
        ? `今日新建与删除任务操作已达上限（普通版 ${limit} 次/天，当前无法${opLabel}）。请升级专业版或使用兑换码解锁更多操作次数！`
        : `今日新建与删除任务操作已达上限（${tierConfig.name}上限 ${limit} 次/天）。`;

    return {
      allowed: false,
      current: opsCount,
      limit,
      remaining: 0,
      tier,
      tierConfig,
      reason: tip,
    };
  }

  const nextOpsCount = opsCount + 1;
  await updateUser(userId, {
    taskOpsCount: nextOpsCount,
    aiGenerateCount: genCount,
    aiAdjustCount: adjCount,
    lastUsageDate: todayStr,
  });

  return {
    allowed: true,
    current: nextOpsCount,
    limit,
    remaining: Math.max(0, limit - nextOpsCount),
    tier,
    tierConfig,
  };
}

export interface AiUsageCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  tier: MembershipTier;
  tierConfig: TierConfig;
  code?: "AI_GENERATE_LIMIT_REACHED" | "AI_ADJUST_LIMIT_REACHED";
  reason?: string;
}

/**
 * 校验并记录每日 AI 使用量：
 * - isAdjustment = true: 输入提示词微调修改任务难度或计划（普通用户上限 10 次/天）
 * - isAdjustment = false: 初始 AI 规划生成（普通用户上限 3 次/天）
 */
export async function checkAndIncrementAiUsage(
  userId: string,
  isAdjustment: boolean
): Promise<AiUsageCheckResult> {
  const user = await getUserById(userId);
  const tier = getUserEffectiveTier(user);
  const tierConfig = TIER_CONFIGS[tier];
  const todayStr = getBeijingDateString();

  let genCount = user?.aiGenerateCount ?? 0;
  let adjCount = user?.aiAdjustCount ?? 0;
  let opsCount = user?.taskOpsCount ?? 0;

  // 跨天重置（以东八区 24:00 为分界）
  if (!user?.lastUsageDate || user.lastUsageDate !== todayStr) {
    genCount = 0;
    adjCount = 0;
    opsCount = 0;
  }

  if (isAdjustment) {
    const limit = tierConfig.limits.dailyAiAdjustLimit;
    if (adjCount >= limit) {
      return {
        allowed: false,
        current: adjCount,
        limit,
        remaining: 0,
        tier,
        tierConfig,
        code: "AI_ADJUST_LIMIT_REACHED",
        reason: `今日任务微调修改（输入提示词调整难度/模块等）已达上限（${tierConfig.name}上限 ${limit} 次/天）。请升级会员或使用兑换码解锁更多修改次数！`,
      };
    }

    const nextCount = adjCount + 1;
    await updateUser(userId, {
      aiAdjustCount: nextCount,
      aiGenerateCount: genCount,
      taskOpsCount: opsCount,
      lastUsageDate: todayStr,
    });

    return {
      allowed: true,
      current: nextCount,
      limit,
      remaining: Math.max(0, limit - nextCount),
      tier,
      tierConfig,
    };
  } else {
    // 完整 AI 规划生成 / 分析
    const limit = tierConfig.limits.dailyAiGenerateLimit;
    if (genCount >= limit) {
      return {
        allowed: false,
        current: genCount,
        limit,
        remaining: 0,
        tier,
        tierConfig,
        code: "AI_GENERATE_LIMIT_REACHED",
        reason: `今日 AI 规划生成次数已达上限（${tierConfig.name}上限 ${limit} 次/天）。请升级会员或使用兑换码解锁更多生成配额！`,
      };
    }

    const nextCount = genCount + 1;
    await updateUser(userId, {
      aiGenerateCount: nextCount,
      aiAdjustCount: adjCount,
      taskOpsCount: opsCount,
      lastUsageDate: todayStr,
    });

    return {
      allowed: true,
      current: nextCount,
      limit,
      remaining: Math.max(0, limit - nextCount),
      tier,
      tierConfig,
    };
  }
}

export interface UserQuotaSummary {
  userId: string;
  tier: MembershipTier;
  tierConfig: TierConfig;
  membershipExpiresAt: string | null;
  isExpired: boolean;
  tasks: {
    current: number;
    limit: number;
    remaining: number;
  };
  taskOps: {
    todayCurrent: number;
    dailyLimit: number;
    remaining: number;
  };
  aiGenerate: {
    todayCurrent: number;
    dailyLimit: number;
    remaining: number;
  };
  aiAdjust: {
    todayCurrent: number;
    dailyLimit: number;
    remaining: number;
  };
}

export async function getUserQuotaSummary(userId: string): Promise<UserQuotaSummary> {
  const user = await getUserById(userId);
  const tier = getUserEffectiveTier(user);
  const tierConfig = TIER_CONFIGS[tier];
  const todayStr = getBeijingDateString();

  const userTasks = await getTasksByUser(userId);
  const taskCount = userTasks.length;

  let genCount = user?.aiGenerateCount ?? 0;
  let adjCount = user?.aiAdjustCount ?? 0;
  let opsCount = user?.taskOpsCount ?? 0;

  if (!user?.lastUsageDate || user.lastUsageDate !== todayStr) {
    genCount = 0;
    adjCount = 0;
    opsCount = 0;
  }

  const isExpired = Boolean(
    user?.membershipExpiresAt &&
      new Date(user.membershipExpiresAt).getTime() > 0 &&
      new Date(user.membershipExpiresAt).getTime() < Date.now()
  );

  return {
    userId,
    tier,
    tierConfig,
    membershipExpiresAt: user?.membershipExpiresAt ? new Date(user.membershipExpiresAt).toISOString() : null,
    isExpired,
    tasks: {
      current: taskCount,
      limit: tierConfig.limits.maxTasks,
      remaining: Math.max(0, tierConfig.limits.maxTasks - taskCount),
    },
    taskOps: {
      todayCurrent: opsCount,
      dailyLimit: tierConfig.limits.dailyTaskOpsLimit,
      remaining: Math.max(0, tierConfig.limits.dailyTaskOpsLimit - opsCount),
    },
    aiGenerate: {
      todayCurrent: genCount,
      dailyLimit: tierConfig.limits.dailyAiGenerateLimit,
      remaining: Math.max(0, tierConfig.limits.dailyAiGenerateLimit - genCount),
    },
    aiAdjust: {
      todayCurrent: adjCount,
      dailyLimit: tierConfig.limits.dailyAiAdjustLimit,
      remaining: Math.max(0, tierConfig.limits.dailyAiAdjustLimit - adjCount),
    },
  };
}
