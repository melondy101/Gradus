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
    dailyAiGenerateLimit: number; // 每天 AI 规划生成上限 (Free: 3, Pro: 30, Premium: 100)
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
    color: "#6B7280",
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
      "每日 5 次新建 AI 规划全案拆解",
      "每日 10 次提示词微调（难度/偏好/模块调整）",
      "支持 Bloom 认知阶梯排期与资源推荐",
      "每日 24:00 (东八区) 自动刷新配额",
    ],
  },
  pro: {
    id: "pro",
    name: "专业版 Pro",
    badge: "PRO",
    color: "#4A7C6F", // warm teal/forest accent
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
    color: "#C4841D", // golden amber
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
      "专属间隔复习与长程认知推演",
      "全功能多设备无缝同步",
    ],
  },
};

export const PRESET_REDEMPTION_CODES = [
  { code: "VIP888", tierName: "专业版 Pro", duration: "30 天", desc: "新手体验福利码" },
  { code: "PRO30", tierName: "专业版 Pro", duration: "30 天", desc: "月度学习成长卡" },
  { code: "GRADUS2026", tierName: "专业版 Pro", duration: "90 天", desc: "拾级进阶季度卡" },
  { code: "GRADUS-VIP", tierName: "专业版 Pro", duration: "30 天", desc: "拾级社区专属月卡" },
  { code: "PREMIUM-SUPER", tierName: "尊享版 Premium", duration: "365 天", desc: "年度旗舰尊享卡" },
  { code: "TALKTASK-VIP", tierName: "专业版 Pro", duration: "30 天", desc: "社区专属月卡" },
];
