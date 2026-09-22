import type { TaskWithSubtasks } from "@/lib/api/tasks";
import type { Subtask } from "@/lib/db/schema";
import { addDays } from "@/components/task/task-dates";

/**
 * /task/parity-probe 的固定样例，内容逐条取自设计稿屏二
 * （output/拾级Gradus-设计预览.html · #view-app-detail）。
 *
 * 起始日锚在「今天 − 2 天」而不是设计稿里的 2026.09.10：
 * 屏二的 done / live / plan 三态由 todayOffsetOf(startDate) 推导，
 * 写死日期会让三态随运行日期退化成单一状态，探针就白测了。
 */

const TASK_ID = "parity-probe-jlpt-n3";
const START_DATE = addDays(new Date(), -2);

function subtask(overrides: Partial<Subtask> & Pick<Subtask, "id" | "title" | "startDay">): Subtask {
  return {
    taskId: TASK_ID,
    description: null,
    durationDays: 3,
    completed: false,
    sortOrder: 0,
    resources: null,
    topic: "语言",
    urgency: null,
    importance: null,
    keywords: null,
    completedAt: null,
    bloomLevel: null,
    deepWorkHours: null,
    createdAt: START_DATE,
    ...overrides,
  };
}

export const PROBE_RESOURCES = JSON.stringify([
  {
    type: "book",
    title: "日本語文法概説 · 第 4 章 受身形",
    url: "https://tokyo-term-learner.jp/bunpaku/ch4-ukemi",
    platform: "tokyo-term-learner.jp",
    trust_level: "verified",
    authority_score: 8.6,
    url_status: "ok",
  },
  {
    type: "article",
    title: "使役受身の使い方 · 例文 60 本",
    searchQuery: "日语 使役被动 例句 60",
    trust_level: "search_only",
  },
]);

export const PROBE_TASK: TaskWithSubtasks = {
  id: TASK_ID,
  userId: "parity-probe-user",
  title: "三个月内通过日语 N3 考试",
  rawInput: "三个月内通过日语 N3 考试",
  tags: JSON.stringify(["语言", "考试"]),
  startDate: START_DATE,
  status: "active",
  totalDays: 34,
  createdAt: START_DATE,
  updatedAt: START_DATE,
  subtasks: [
    subtask({
      id: "probe-1",
      title: "假名与发音定型",
      startDay: 0,
      durationDays: 2,
      completed: true,
      bloomLevel: 2,
      deepWorkHours: 3,
      completedAt: addDays(START_DATE, 1),
      keywords: JSON.stringify(["五十音", "发音"]),
      description: "跟读五十音表并录音比对；\n整理拗音、促音、长音各 10 张卡片；\n用 20 个生词做发音自测。",
    }),
    subtask({
      id: "probe-2",
      title: "N4 语法收尾：助词与被动表达",
      startDay: 2,
      durationDays: 3,
      bloomLevel: 4,
      deepWorkHours: 3.5,
      urgency: 5,
      importance: 5,
      keywords: JSON.stringify(["助词", "被动", "使役"]),
      resources: PROBE_RESOURCES,
      description:
        "整理 は/が 各 8 条例句并标注语义差异；\n做被动 ↔ 使役 ↔ 使役被动转换表 20 行；\n计时改写 20 句，错 ≤ 2 即通过。",
    }),
    subtask({
      id: "probe-3",
      title: "敬语与书面表达入门",
      startDay: 5,
      durationDays: 4,
      bloomLevel: 4,
      deepWorkHours: 5,
      description: "对照表梳理尊敬语 / 谦让语 / 礼貌语；\n写 3 封 200 字邮件并标注敬语层级。",
    }),
    subtask({
      id: "probe-4",
      title: "N3 真题模考与复盘",
      startDay: 9,
      durationDays: 4,
      bloomLevel: 5,
      deepWorkHours: 8,
      description: "限时完成两套 N3 真题；\n按题型统计失分并回看对应语法点。",
    }),
  ],
};
