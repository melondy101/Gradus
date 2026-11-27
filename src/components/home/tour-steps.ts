import type { ComponentType } from "react";
import { BookOpen, Sparkles, TrendingUp } from "lucide-react";

export interface TourStep {
  targetSelector: string;
  fallbackSelector?: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  preferredPlacement?: "bottom" | "top" | "right" | "left";
  actionHint?: string;
  exampleGoal?: string;
}

/** 三步引导：锚点 id 由 top-nav / home-workspace 约定，勿改（见各处 id 注释） */
export const TOUR_STEPS: TourStep[] = [
  {
    targetSelector: "#nav-btn-new-plan",
    title: "第一步：输入模糊学习目标",
    subtitle: "从一句话或一段链接开启规划",
    description:
      "无需担心目标过于模糊。点击顶栏「新建」或按键盘 N，输入任何你想掌握的知识（如“精通 Python 异步编程”或粘贴 B站/arXiv/GitHub 链接），AI 引擎会自动解析意图与前置背景。",
    badge: "1 / 3 目标解析",
    icon: Sparkles,
    preferredPlacement: "bottom",
    actionHint: "可点击下方按钮一键填入精选示例试用：",
    exampleGoal: "精通 Python 异步编程与 asyncio 实战",
  },
  {
    targetSelector: "#nav-rail-group",
    fallbackSelector: "#nav-item-steps",
    title: "第二步：循序渐进的布鲁姆认知阶梯",
    subtitle: "告别认知过载，全局接续排期",
    description:
      "AI 规划流水线依据布鲁姆教育目标分类学（记忆 ➔ 理解 ➔ 应用 ➔ 分析 ➔ 评估 ➔ 创造）由浅入深构建任务梯度，并智能错开认知负载、分配到每日学习槽位中。顶栏导航可在四个视图间随时切换。",
    badge: "2 / 3 认知阶梯",
    icon: TrendingUp,
    preferredPlacement: "bottom",
  },
  {
    targetSelector: "#panel-right-container",
    fallbackSelector: "#today-task-area",
    title: "第三步：权威资源推荐与打卡成长",
    subtitle: "真实可信链接，步步扎实留痕",
    description:
      "所有任务均基于 Tavily 深度检索官方文档、学术论文与权威视频，杜绝编造链接。完成学习后一键打卡，自动累计深度学习时长并解锁阶段性成长里程碑！",
    badge: "3 / 3 权威资源",
    icon: BookOpen,
    preferredPlacement: "left",
  },
];

export const ONBOARDING_STORAGE_KEY = "gradus_onboarding_completed_v1";
