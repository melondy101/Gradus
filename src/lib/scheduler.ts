/**
 * AutoTask 全局排期算法 v3
 *
 * ─── 原有理论依据（1-7，保持不变）──────────────────────────────────
 *
 * 1. 接续排期：新任务从所有活跃任务最末日 +1 开始。
 * 2. 每日深度工作上限：MAX_SUBTASKS_PER_DAY = 3（≈ 2-4h 深度工作）。
 *    依据：Cal Newport《Deep Work》& Ericsson 每日 4h 上限研究。
 * 3. 交错主题学习：同一主题每天 ≤ 1 次。
 *    依据：Kornell & Bjork (2008) — 交错练习长期留存率 +43%。
 * 4. 四象限优先级：urgency × importance + Q2 战略加成。
 *    依据：Covey (1989) Eisenhower Matrix。
 * 5. 递延惩罚：每超期 7 天 +8 分，防止任务雪球效应。
 *    依据：Todoist Smart Schedule 设计。
 * 6. Bloom 分层：低层级子任务优先排在前面（脚手架学习）。
 *    依据：Anderson & Krathwohl (2001) + Vygotsky ZPD。
 * 7. 窗口式排期：空白 >7 天则新任务直接从今天开始。
 *
 * ─── v3 新增（方向 A & B）────────────────────────────────────────────
 *
 * 8. [方向A] Flow-State 难度波浪（Daily Difficulty Wave）
 *    理论：Csikszentmihalyi (1990) Flow Theory + BRAC 90 分钟周期
 *          (Kleitman, 1963; Lavie, Technion Institute)。
 *    实现：每天高难度任务（Bloom ≥ HIGH_BLOOM_THRESHOLD=4）上限 =
 *          MAX_HIGH_BLOOM_PER_DAY = 1。当天已有高难度任务后，
 *          后续只能安排 Bloom ≤ 3 的内容（复习/理解/应用），
 *          形成"高峰 + 缓坡"的自然难度波浪，保持心流、减少疲劳。
 *
 * 9. [方向A] BRAC 时长对齐（90-min Block Alignment）
 *    实现：assessTaskDuration 新增 estimatedHours 参数，
 *          将学习时长映射到推荐天数：
 *            ≤1.5h → 1 块 → 1 天
 *            1.5-3h → 2 块 → 1-2 天
 *            3-4.5h → 3 块 → 2-3 天（每日上限）
 *            >4.5h → 建议拆分
 *
 * 10. [方向B] 跨领域认知距离惩罚（Domain Affinity Matrix）
 *    理论：Rubinstein, Meyer & Evans (2001) — 任务切换导致效率
 *          损失最高 40%；不同神经回路的领域切换代价极高。
 *    实现：8×8 DOMAIN_AFFINITY_MATRIX 量化 8 个学习领域间的
 *          认知回路相似度。DailySlot 记录当天已安排的领域，
 *          若新任务与已安排领域的最低亲和度 < DOMAIN_AFFINITY_THRESHOLD
 *          (0.4) 则触发软惩罚（最多推 DOMAIN_PENALTY_MAX_SKIP=3 天后放弃）。
 *          编程+数学（0.85，高亲和）可同天；编程+绘画（0.2，低亲和）
 *          优先跨天安排。
 */

// ─── Constants ────────────────────────────────────────────────────────

export const MAX_SUBTASKS_PER_DAY = 3;
export const MAX_SAME_TOPIC_PER_DAY = 1;
export const SCHEDULING_WINDOW_DAYS = 7;
export const REVIEW_INTERVAL_DAYS = 5;

/** [方向A] 每天高难度（Bloom ≥ HIGH_BLOOM_THRESHOLD）子任务上限 */
export const MAX_HIGH_BLOOM_PER_DAY = 1;
/** [方向A] "高难度"阈值（分析/评估/创造 = Bloom 4/5/6）*/
export const HIGH_BLOOM_THRESHOLD = 4;

/** [方向B] 领域亲和度低于此值时触发软惩罚 */
export const DOMAIN_AFFINITY_THRESHOLD = 0.4;
/** [方向B] 软约束最多推迟天数，超过后放弃软约束 */
export const DOMAIN_PENALTY_MAX_SKIP = 3;

// ─── Bloom's Taxonomy Level ────────────────────────────────────────────

export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  1: "记忆",
  2: "理解",
  3: "应用",
  4: "分析",
  5: "评估",
  6: "创造",
};

// ─── [方向B] 领域分类 & 亲和度矩阵 ──────────────────────────────────────

export const LEARNING_DOMAINS = [
  "编程与技术",   // 0
  "数学与逻辑",   // 1
  "语言与写作",   // 2
  "自然科学",     // 3
  "人文与社科",   // 4
  "艺术与创作",   // 5
  "身体与健康",   // 6
  "职业与商业",   // 7
] as const;

export type LearningDomain = typeof LEARNING_DOMAINS[number];

/**
 * [方向B] 8×8 领域亲和度矩阵（对称，值域 0.0~1.0）
 * 行/列顺序：[编程, 数学, 语言, 自然科学, 人文社科, 艺术创作, 身体健康, 职业商业]
 *
 * 值含义（基于 Rubinstein et al., 2001 任务切换研究）：
 *   1.0  — 共享同一核心认知回路（编程↔数学：抽象逻辑）
 *   0.7+ — 大量共享（数学↔自然科学：推导思维）
 *   0.5  — 轻度重叠（编程↔职业商业：工程实践）
 *   0.3  — 不同回路，切换代价较高（语言↔数学）
 *   0.1  — 完全不同回路，切换代价极高（编程↔身体健康）
 */
export const DOMAIN_AFFINITY_MATRIX: number[][] = [
  //  编程   数学   语言   自然科学  人文社科  艺术创作  身体健康  职业商业
  [  1.0,  0.85,  0.3,   0.7,    0.4,    0.2,    0.1,   0.5  ],  // 编程与技术
  [  0.85, 1.0,   0.3,   0.75,   0.4,    0.2,    0.1,   0.45 ],  // 数学与逻辑
  [  0.3,  0.3,   1.0,   0.35,   0.75,   0.55,   0.2,   0.5  ],  // 语言与写作
  [  0.7,  0.75,  0.35,  1.0,    0.5,    0.3,    0.3,   0.45 ],  // 自然科学
  [  0.4,  0.4,   0.75,  0.5,    1.0,    0.5,    0.2,   0.6  ],  // 人文与社科
  [  0.2,  0.2,   0.55,  0.3,    0.5,    1.0,    0.4,   0.4  ],  // 艺术与创作
  [  0.1,  0.1,   0.2,   0.3,    0.2,    0.4,    1.0,   0.3  ],  // 身体与健康
  [  0.5,  0.45,  0.5,   0.45,   0.6,    0.4,    0.3,   1.0  ],  // 职业与商业
];

/**
 * 将主题字符串解析为领域索引（0-7）。
 * 无法匹配返回 -1（不受亲和度约束）。
 */
export function resolveDomainIndex(topic: string): number {
  const t = topic.trim();
  if (/编程|技术|代码|程序|算法|web|ai|机器学习/i.test(t)) return 0;
  if (/数学|逻辑|微积分|统计|离散|代数/i.test(t)) return 1;
  if (/语言|写作|英语|日语|中文|文章|阅读/i.test(t)) return 2;
  if (/物理|化学|生物|自然|科学|天文/i.test(t)) return 3;
  if (/历史|哲学|经济|心理|社科|人文|政治/i.test(t)) return 4;
  if (/艺术|绘画|音乐|设计|摄影|创作|手工/i.test(t)) return 5;
  if (/健身|运动|健康|营养|冥想|身体/i.test(t)) return 6;
  if (/职业|商业|产品|营销|投资|管理|创业/i.test(t)) return 7;
  return -1;
}

/**
 * [方向B] 计算新任务领域与某天已安排领域的最低亲和度（0~1）。
 * 当天无任务或领域不可识别时返回 1.0（无惩罚）。
 */
export function computeDayAffinityScore(
  newTopic: string,
  scheduledTopics: string[],
): number {
  if (scheduledTopics.length === 0) return 1.0;
  const newIdx = resolveDomainIndex(newTopic);
  if (newIdx === -1) return 1.0;
  let minAffinity = 1.0;
  for (const existing of scheduledTopics) {
    const existIdx = resolveDomainIndex(existing);
    if (existIdx === -1) continue;
    const affinity = DOMAIN_AFFINITY_MATRIX[newIdx][existIdx];
    if (affinity < minAffinity) minAffinity = affinity;
  }
  return minAffinity;
}

// ─── Core Interfaces ──────────────────────────────────────────────────

export interface ScheduledTask {
  taskId: string;
  startDate: Date;
  totalDays: number;
  priorityScore: number;
  topicCategory: string;
  createdAt: Date;
}

export interface TaskPriority {
  taskId: string;
  urgencyScore: number;
  importanceScore: number;
  originalStartDate?: Date;
  topicCategory: string;
  totalDays: number;
  bloomLevel?: BloomLevel;
}

/**
 * 每日排期状态。
 * v3 新增：highBloomCount [方向A]、scheduledTopics [方向B]
 */
export interface DailySlot {
  date: string;
  subtaskCount: number;
  topicCounts: Map<string, number>;
  highBloomCount: number;     // [方向A] 当天高难度任务数（Bloom ≥ 4）
  scheduledTopics: string[];  // [方向B] 当天已安排的领域列表
}

// ─── 1. 接续排期：计算新任务起始日期 ────────────────────────────────────

/**
 * 计算新任务的 startDate。
 *
 * 策略：
 * - 找到所有活跃任务的最末结束日
 * - 新任务从其 +1 天开始
 * - 若最末结束日距今超过 SCHEDULING_WINDOW_DAYS，则直接从今天开始
 *   （防止新任务被排到遥远的未来）
 */
export function computeNewTaskStartDate(
  existingTasks: ScheduledTask[],
  today: Date,
): Date {
  const activeTasks = existingTasks.filter(
    (t) => t.startDate != null && t.totalDays > 0
  );

  if (activeTasks.length === 0) {
    return today;
  }

  let latestEnd = today;
  for (const t of activeTasks) {
    const end = addDays(t.startDate, t.totalDays);
    if (end > latestEnd) latestEnd = end;
  }

  const daysBeyondToday = diffDays(today, latestEnd);

  // 窗口式排期：若最末日超过今天 7 天以上，直接从今天开始
  if (daysBeyondToday > SCHEDULING_WINDOW_DAYS) {
    return today;
  }

  const next = addDays(latestEnd, 1);
  return next < today ? today : next;
}

// ─── 2. 优先级排序（四象限 + 递延惩罚 + Q2 战略加成）─────────────────────

/**
 * 四象限 × 递延惩罚综合优先级排序。
 *
 * 算法设计：
 * - 基础分 = urgency(1-5) × importance(1-5)  → 最高 25 分
 * - Q2 战略加成：urgency ≤ 2 且 importance ≥ 4 → +5 分
 *   （重要不紧急的任务最容易被忽视，参考 Covey 第二象限理论）
 * - 递延惩罚：每超期 7 天 +8 分（参考 Todoist Smart Schedule 设计）
 */
export function rankTasksByPriority(
  tasks: TaskPriority[],
  today: Date,
): string[] {
  const todayMs = today.getTime();

  const scored = tasks.map((t) => {
    const quadrantScore = t.urgencyScore * t.importanceScore;

    // Q2 战略加成：重要但不紧急的任务容易被拖延，给予提前奖励
    const q2Bonus =
      t.urgencyScore <= 2 && t.importanceScore >= 4 ? 5 : 0;

    // 递延惩罚
    let delayBonus = 0;
    if (t.originalStartDate) {
      const daysOverdue = Math.floor(
        (todayMs - t.originalStartDate.getTime()) / 86400000
      );
      if (daysOverdue > 0) {
        delayBonus = Math.floor(daysOverdue / 7) * 8;
      }
    }

    const finalScore = quadrantScore + q2Bonus + delayBonus;
    return { taskId: t.taskId, finalScore };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  return scored.map((s) => s.taskId);
}

// ─── 3. 每日容量检查（Deep Work Budget + 交错主题）──────────────────────

/**
 * 检查某一天是否还有子任务槽位（未达到 MAX_SUBTASKS_PER_DAY）
 */
export function hasDailyCapacity(
  dateStr: string,
  slots: Map<string, DailySlot>,
): boolean {
  const slot = slots.get(dateStr);
  if (!slot) return true;
  return slot.subtaskCount < MAX_SUBTASKS_PER_DAY;
}

/**
 * 检查某主题在某天是否还可以安排（未超过 MAX_SAME_TOPIC_PER_DAY）
 *
 * 交错学习原则：同一主题每天最多 1 次，强制不同主题交替出现。
 * 研究依据：Kornell & Bjork (2008) 发现交错练习比集中练习
 * 在长期测试中平均提升 43% 的记忆保留率。
 */
export function canScheduleTopic(
  dateStr: string,
  topicCategory: string,
  slots: Map<string, DailySlot>,
): boolean {
  const slot = slots.get(dateStr);
  if (!slot) return true;
  const count = slot.topicCounts.get(topicCategory) ?? 0;
  return count < MAX_SAME_TOPIC_PER_DAY;
}

/**
 * [方向A] 检查某天是否还可以安排高难度任务（Bloom ≥ HIGH_BLOOM_THRESHOLD）。
 *
 * 依据：Csikszentmihalyi Flow Theory + BRAC 90 分钟周期研究。
 * 每天认知峰值资源有限，最多支撑 1 个深度思考任务；
 * 超过这个数量进入焦虑区而非心流区，引发认知疲劳甚至放弃。
 * 剩余槽位分配给低难度内容（复习/理解），形成难度波浪。
 */
export function canScheduleHighBloom(
  dateStr: string,
  bloomLevel: number,
  slots: Map<string, DailySlot>,
): boolean {
  if (bloomLevel < HIGH_BLOOM_THRESHOLD) return true;
  const slot = slots.get(dateStr);
  if (!slot) return true;
  return slot.highBloomCount < MAX_HIGH_BLOOM_PER_DAY;
}

/**
 * [方向B] 检查某天安排当前领域是否满足亲和度阈值（软约束）。
 *
 * 依据：Rubinstein et al., 2001——使用不同神经回路的任务切换代价
 * 极高，DOMAIN_AFFINITY_MATRIX 量化了各领域间的回路相似度。
 * 亲和度过低时返回 false，触发软惩罚（推迟 1 天，非硬拒绝）。
 */
export function isDomainCompatible(
  dateStr: string,
  topicCategory: string,
  slots: Map<string, DailySlot>,
): boolean {
  const slot = slots.get(dateStr);
  if (!slot || slot.scheduledTopics.length === 0) return true;
  const affinity = computeDayAffinityScore(topicCategory, slot.scheduledTopics);
  return affinity >= DOMAIN_AFFINITY_THRESHOLD;
}

/**
 * 向 DailySlot 注册一个子任务占位。
 * v3：同时更新 highBloomCount [方向A] 和 scheduledTopics [方向B]。
 */
export function registerDailySlot(
  dateStr: string,
  topicCategory: string,
  slots: Map<string, DailySlot>,
  bloomLevel = 0,
): void {
  if (!slots.has(dateStr)) {
    slots.set(dateStr, {
      date: dateStr,
      subtaskCount: 0,
      topicCounts: new Map(),
      highBloomCount: 0,
      scheduledTopics: [],
    });
  }
  const slot = slots.get(dateStr)!;
  slot.subtaskCount += 1;
  slot.topicCounts.set(topicCategory, (slot.topicCounts.get(topicCategory) ?? 0) + 1);
  if (bloomLevel >= HIGH_BLOOM_THRESHOLD) slot.highBloomCount += 1; // [方向A]
  slot.scheduledTopics.push(topicCategory);                         // [方向B]
}

/**
 * 为一个子任务寻找满足全部约束的最早可用日期。
 *
 * 约束层级（优先级从高到低）：
 *   硬约束 1: subtaskCount < MAX_SUBTASKS_PER_DAY
 *   硬约束 2: 同主题 ≤ MAX_SAME_TOPIC_PER_DAY
 *   硬约束 3: [方向A] 高难度任务 ≤ MAX_HIGH_BLOOM_PER_DAY
 *   软约束 4: [方向B] 领域亲和度 ≥ DOMAIN_AFFINITY_THRESHOLD
 *             （软约束最多推 DOMAIN_PENALTY_MAX_SKIP 天后放弃）
 *
 * 两轮搜索：
 *   第 1 轮（≤ DOMAIN_PENALTY_MAX_SKIP+1 天）：硬约束 + 软约束
 *   第 2 轮（≤ maxSearchDays 天）：仅硬约束（保证总能找到结果）
 *
 * @param earliestStart  最早可以开始的日期
 * @param topicCategory  子任务主题
 * @param slots          当前每日槽位状态
 * @param bloomLevel     子任务 Bloom 层级（默认 2）
 * @param maxSearchDays  最大搜索天数（防止死循环）
 */
export function findNextAvailableDay(
  earliestStart: Date,
  topicCategory: string,
  slots: Map<string, DailySlot>,
  bloomLevel = 2,
  maxSearchDays = 60,
): Date {
  // ── 第一轮：硬约束 + 软约束（领域亲和度）──────────────────────────
  let candidate = earliestStart;
  for (let i = 0; i <= DOMAIN_PENALTY_MAX_SKIP; i++) {
    const dateStr = toDateStr(candidate);
    if (
      hasDailyCapacity(dateStr, slots) &&
      canScheduleTopic(dateStr, topicCategory, slots) &&
      canScheduleHighBloom(dateStr, bloomLevel, slots) && // [方向A]
      isDomainCompatible(dateStr, topicCategory, slots)  // [方向B]
    ) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }

  // ── 第二轮：放宽软约束，仅保留硬约束 ─────────────────────────────
  candidate = earliestStart;
  for (let i = 0; i < maxSearchDays; i++) {
    const dateStr = toDateStr(candidate);
    if (
      hasDailyCapacity(dateStr, slots) &&
      canScheduleTopic(dateStr, topicCategory, slots) &&
      canScheduleHighBloom(dateStr, bloomLevel, slots)   // [方向A] 保留
    ) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
  }

  return earliestStart; // fallback
}

// ─── 4. Bloom 序列验证 ──────────────────────────────────────────────────

/**
 * 验证子任务序列的 Bloom 层级是否整体呈上升趋势。
 *
 * 脚手架学习理论（Vygotsky ZPD）要求：
 * 任务应从低认知负荷（记忆/理解）逐步过渡到高认知负荷（分析/创造）。
 * 允许适当回落（如复盘子任务），但总体趋势应是上升的。
 *
 * @returns true = 顺序合理，false = 存在跳跃或倒序问题
 */
export function validateBloomSequence(
  bloomLevels: BloomLevel[],
): boolean {
  if (bloomLevels.length < 2) return true;

  let maxSeen = 0;
  let violations = 0;

  for (const level of bloomLevels) {
    if (level < maxSeen - 2) {
      // 允许小幅回落（复盘），但不能大幅倒退
      violations++;
    }
    maxSeen = Math.max(maxSeen, level);
  }

  // 超过 30% 的节点违规则认为序列不合理
  return violations / bloomLevels.length < 0.3;
}

/**
 * 根据子任务列表建议需要在哪些节点插入复习（spaced repetition 思路）。
 *
 * 参考 SuperMemo SM-2 算法：第 1 次复习在 1 天后，第 2 次在 5 天后，
 * 后续按 1 → 5 → REVIEW_INTERVAL_DAYS 间隔递增。
 * 此处简化：每学习 REVIEW_INTERVAL_DAYS 天的内容后，
 * 建议在该段结束时加入一个复习子任务。
 *
 * @returns 建议插入复习节点的 startDay 列表
 */
export function suggestReviewNodes(
  subtasks: Array<{ startDay: number; durationDays: number }>,
): number[] {
  const reviewPoints: number[] = [];
  let lastReviewDay = 0;

  for (const s of subtasks) {
    const endDay = s.startDay + s.durationDays;
    if (endDay - lastReviewDay >= REVIEW_INTERVAL_DAYS) {
      reviewPoints.push(endDay);
      lastReviewDay = endDay;
    }
  }

  return reviewPoints;
}

// ─── 5. 工期合理性评估（v3：含 BRAC 对齐）────────────────────────────

/**
 * 评估单个子任务的工期是否合理。
 *
 * v3 [方向A] 新增 estimatedHours 参数：
 * 将预计学习时长映射到推荐天数（BRAC 90 分钟块对齐）：
 *
 *   ≤ 1.5h  →  1 块 → 推荐 1 天
 *   1.5-3h  →  2 块 → 推荐 1-2 天
 *   3-4.5h  →  3 块 → 推荐 2-3 天（每日认知上限）
 *   > 4.5h  →  超出每日上限，建议拆分
 *
 * 依据：Kleitman/Lavie BRAC 研究 + Ericsson 每日深度工作上限研究。
 *
 * @param durationDays    计划工期（天）
 * @param bloomLevel      Bloom 层级（高层级允许更长工期）
 * @param estimatedHours  预计每日学习时长（小时），可选
 */
export function assessTaskDuration(
  durationDays: number,
  bloomLevel: BloomLevel = 3,
  estimatedHours?: number,
): { ok: boolean; suggestion?: string; recommendedDays?: number } {

  // [方向A] BRAC 块对齐优先判断
  if (estimatedHours !== undefined && estimatedHours > 0) {
    const BRAC_BLOCK_HOURS = 1.5;
    const MAX_DAILY_HOURS = 4.5; // Ericsson：3 个 BRAC 块是每日深度工作上限

    if (estimatedHours > MAX_DAILY_HOURS) {
      const recommendedDays = Math.ceil(estimatedHours / MAX_DAILY_HOURS);
      return {
        ok: false,
        suggestion: `预计 ${estimatedHours}h 超过每日认知上限（4.5h / 3个BRAC块），建议拆分为 ${recommendedDays} 天`,
        recommendedDays,
      };
    }

    const bracBlocks = Math.ceil(estimatedHours / BRAC_BLOCK_HOURS);
    const recommendedDays = bracBlocks <= 1 ? 1 : bracBlocks <= 2 ? 2 : 3;

    if (durationDays < recommendedDays) {
      return {
        ok: false,
        suggestion: `${estimatedHours}h 的内容建议至少 ${recommendedDays} 天（对应 ${bracBlocks} 个 BRAC 90分钟块）`,
        recommendedDays,
      };
    }
    return { ok: true, recommendedDays };
  }

  // 无 estimatedHours 时沿用 Bloom-based 检查
  const maxRecommended = bloomLevel >= 4 ? 7 : 5;
  if (durationDays < 1) {
    return { ok: false, suggestion: `工期 ${durationDays} 天过短，建议至少 1 天` };
  }
  if (durationDays > maxRecommended) {
    return {
      ok: false,
      suggestion: `工期 ${durationDays} 天过长，建议拆分为 ${Math.ceil(durationDays / 2)} 天的子步骤`,
    };
  }
  return { ok: true };
}

// ─── Utilities ────────────────────────────────────────────────────────

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayMidnight(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 计算两个日期相差天数（b - a，可为负） */
export function diffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}
