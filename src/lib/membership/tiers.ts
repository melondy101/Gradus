export type MembershipTier = "free" | "pro" | "premium";

export interface TierConfig {
  id: MembershipTier;
  name: string;
  badge: string;
  color: string;
  tagline: string;
  priceDesc: string;
  limits: {
    maxTasks: number; // 普通: 2, Pro: 20, Premium: 999
    dailyTaskOpsLimit: number; // 每天任务新建+删除总操作次数上限 (Free: 5, Pro: 50, Premium: 500)
    /**
     * 每天 AI 规划生成上限 —— **仅在未开启收款（自托管）时生效**。
     * 开启收款后走额度包模型（见 src/lib/commerce/credits.ts）：
     * 试用 3 次 + 每日刷新 1 次，与下面的 features 文案保持一致。
     */
    dailyAiGenerateLimit: number;
    dailyAiAdjustLimit: number; // 每天 AI 提示词微调修改上限 (Free: 10, Pro: 100, Premium: 500)
  };
  features: string[];
  highlight?: boolean;
}

export const TIER_CONFIGS: Record<MembershipTier, TierConfig> = {
  free: {
    id: "free",
    name: "免费版",
    badge: "FREE",
    color: "var(--text-3)",
    tagline: "基础学习起步体验",
    priceDesc: "永久免费",
    limits: {
      maxTasks: 2,
      dailyTaskOpsLimit: 10,
      dailyAiGenerateLimit: 5,
      dailyAiAdjustLimit: 10,
    },
    features: [
      "最多同时拥有 2 个学习任务",
      "试用 3 次完整 AI 规划（含重排），用完后每天再送 1 次",
      "支持 Bloom 认知阶梯排期与资源推荐",
      "资源校验到「课程是否还开着」，别再被失效链接坑",
      "每日 24:00 (东八区) 自动刷新每日额度",
    ],
  },
  pro: {
    id: "pro",
    name: "专业版 Pro",
    badge: "PRO",
    color: "var(--success)",
    tagline: "深度自主学习者首选",
    priceDesc: "兑换码 / 季度进阶",
    highlight: true,
    limits: {
      maxTasks: 5,
      dailyTaskOpsLimit: 50,
      dailyAiGenerateLimit: 20,
      dailyAiAdjustLimit: 100,
    },
    features: [
      "最多同时拥有 5 个学习任务",
      "每日 20 次新建 AI 规划全案拆解",
      "每日 100 次提示词微调与重排",
      "多任务交错时间槽排期与冲突检测",
      "周报生成与专属结业证书",
      "优先 AI 算力通道响应",
    ],
  },
  premium: {
    id: "premium",
    name: "尊享版 Premium",
    badge: "PREMIUM",
    color: "var(--accent)",
    tagline: "极致无拘全功能体验",
    priceDesc: "兑换码 / 年度尊享",
    limits: {
      maxTasks: 10,
      dailyTaskOpsLimit: 200,
      dailyAiGenerateLimit: 100,
      dailyAiAdjustLimit: 500,
    },
    features: [
      "最多同时拥有 10 个学习任务",
      "每日 100 次新建 AI 规划全案拆解",
      "每日 500 次深度提示词微调修改",
      "最高优先级 AI 算力通道与零等待",
      "全功能多设备无缝同步",
    ],
  },
};
