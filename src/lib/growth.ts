/**
 * 成长反馈体系：等级/里程碑 + 即时激励文案
 * 以「累计完成子任务数 totalCompleted」为主线，形成初学→精通的成长叙事。
 * 被累计成就面板(A)、里程碑徽章(B)、即时微激励(D)共用。
 */

export interface Level {
  /** 达到本等级所需的累计完成数（下限，含） */
  threshold: number;
  /** 等级名 */
  name: string;
  /** 图标 */
  icon: string;
  /** 主题色 */
  color: string;
}

/** 等级阶梯（按 threshold 升序） */
export const LEVELS: Level[] = [
  { threshold: 0,   name: "起步",   icon: "🌱", color: "#8AA399" },
  { threshold: 5,   name: "初学",   icon: "📖", color: "#3B7AFF" },
  { threshold: 10,  name: "进阶",   icon: "🚀", color: "#7C5CFC" },
  { threshold: 20,  name: "熟练",   icon: "⭐", color: "#E07B2A" },
  { threshold: 40,  name: "精通",   icon: "🏅", color: "#E0A32A" },
  { threshold: 80,  name: "大师",   icon: "👑", color: "#C9A227" },
];

/** 里程碑门槛（用于「解锁」提示，与等级门槛一致但去掉 0） */
export const MILESTONES = LEVELS.filter((l) => l.threshold > 0).map((l) => l.threshold);

/** 根据累计完成数取当前等级 */
export function getLevel(totalCompleted: number): Level {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (totalCompleted >= l.threshold) current = l;
    else break;
  }
  return current;
}

/** 取下一等级（已满级返回 null） */
export function getNextLevel(totalCompleted: number): Level | null {
  for (const l of LEVELS) {
    if (totalCompleted < l.threshold) return l;
  }
  return null;
}

/** 当前等级内的进度：{ done, need, pct } —— done/need 指“距离下一级还差多少” */
export function getLevelProgress(totalCompleted: number): { done: number; need: number; pct: number } {
  const cur = getLevel(totalCompleted);
  const next = getNextLevel(totalCompleted);
  if (!next) return { done: 1, need: 1, pct: 1 };
  const span = next.threshold - cur.threshold;
  const done = totalCompleted - cur.threshold;
  return { done, need: span, pct: Math.max(0, Math.min(1, done / span)) };
}

/**
 * 判断本次完成是否刚好跨过某个里程碑门槛。
 * @param before 完成前的累计数
 * @param after  完成后的累计数
 * @returns 跨过的里程碑等级（若有）
 */
export function crossedMilestone(before: number, after: number): Level | null {
  for (const l of LEVELS) {
    if (l.threshold > 0 && before < l.threshold && after >= l.threshold) return l;
  }
  return null;
}

/** 即时微激励文案：根据“今日第几个 / 累计第几个”给正向反馈 */
export function encourageMessage(todayIndex: number, totalAfter: number): string {
  const cheer =
    todayIndex === 1 ? "今天第一步，开了个好头！" :
    todayIndex <= 3   ? `今天已完成 ${todayIndex} 项，稳步推进 💪` :
    todayIndex <= 6   ? `今天第 ${todayIndex} 项，状态很棒 🔥` :
                        `今天第 ${todayIndex} 项，火力全开 🚀`;
  return `${cheer} · 累计第 ${totalAfter} 个小步骤`;
}
