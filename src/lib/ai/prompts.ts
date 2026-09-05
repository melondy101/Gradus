/**
 * src/lib/ai/prompts.ts
 *
 * AutoTask 分析流水线的所有 AI Prompt 模板。
 * 统一管理、版本可追踪，与 route.ts 业务逻辑解耦。
 *
 * 使用方式：
 *   import { INTENT_PROMPT, RESOURCE_INTENT_PROMPT, PLAN_PROMPT, VALIDATE_PROMPT } from "@/lib/ai/prompts";
 *   const filled = PLAN_PROMPT.replace("{GOAL}", goal).replace("{DOMAIN}", domain)...
 */

// ─── Stage 1: Intent Analysis ────────────────────────────────────────────────
// 理论依据：
// - Vygotsky ZPD 理论：先评估先备知识，才能设定合适的学习起点
// - Bloom 认知分类法：明确最终目标层级，反向设计学习路径
// - 学习目标类型区分：技能型/知识型/项目型需要不同的练习结构

export const INTENT_PROMPT = `你是一名专业学习规划顾问，擅长应用教育心理学理论分析学习目标。
请分析用户输入的学习目标，提取以下信息并以 JSON 格式回复（不要加 markdown 代码块）：

{
  "task_name": "正式任务名称，不超过 16 字，动宾结构（如：掌握Python基础/攻克高考数学）",
  "topic_category": "主题类别（仅选一个）：数学 / 编程 / 语言 / 科学 / 艺术 / 商业 / 历史 / 健身 / 其他",
  "urgency": 3,
  "importance": 4,
  "prior_knowledge_level": "beginner",
  "learning_goal_type": "skill",
  "bloom_target_level": 3,
  "estimated_total_hours": 20,
  "search_keywords": ["关键词1", "关键词2", "关键词3"],
  "subject_domain": "具体领域，如：高中数学/Python入门/英语口语/投资理财（2-8字）"
}

字段说明：
- urgency/importance：1-5 整数，根据学习场景合理判断（备考=高urgency，兴趣探索=低urgency）
- prior_knowledge_level：评估学习者可能的基础
  * beginner：完全零基础，需要从头开始
  * intermediate：有一定了解，可跳过入门直接进阶
  * advanced：已有较深基础，目标是专项提升
- learning_goal_type：
  * skill：需要反复练习才能掌握（编程/乐器/语言口语）
  * knowledge：以理解和记忆为主（历史/理论/概念）
  * project：以完成具体产出为目标（写论文/做项目/准备考试）
- bloom_target_level：该目标在 Bloom 认知分类法中的目标层级
  * 1=记忆（背诵）2=理解（解释）3=应用（使用）4=分析（检验）5=评估（判断）6=创造（设计）
- estimated_total_hours：完成该目标预计需要的总小时数（15-200小时范围）
- search_keywords：3-5个最能代表该主题的中英文搜索词`;

// ─── Stage 2: Resource Search Intent ─────────────────────────────────────────
// 设计原则（来自 Perplexity Pipeline 研究 + arXiv 引用验证研究）：
//
//   ⚠️ 旧方案（已废弃）：让 AI 直接生成带 URL 的资源列表
//      问题：LLM 幻觉率 15-25%，编造的 URL 看起来可信但实际 404
//
//   ✅ 新方案（两阶段分离）：
//      Step A — AI 只生成搜索意图（关键词 + 用途），禁止生成任何 URL
//      Step B — 代码调用 Tavily API，从白名单域名里检索真实资源
//      Step C — 把真实 URL 注入后续 Prompt，LLM 只能引用代码拿到的资源
//
//   "Because steps B and C are CODE, they always run."
//   URL 的真实性由代码保证，不受 LLM 随机性影响。

export const RESOURCE_INTENT_PROMPT = `你是一名资深学习顾问，擅长为不同基础的学习者设计搜索策略。

学习目标：{GOAL}
主题领域：{DOMAIN}
学习者基础：{PRIOR_LEVEL}
参考关键词：{KEYWORDS}

【重要规则】你的任务是生成"搜索意图"列表，而不是资源列表。
不要生成任何 URL、链接或网址。只生成搜索词和用途说明。
资源的真实 URL 将由系统代码自动检索，不需要你提供。

请以 JSON 格式回复 5-8 个搜索意图（不要加 markdown 代码块）：

{
  "search_intents": [
    {
      "query": "可以直接放入搜索引擎的搜索词（中英文均可，尽量精准）",
      "purpose": "这个搜索的目的（10字以内，如：Python入门教程/数学基础练习）",
      "learning_phase": "input",
      "suitable_for": "beginner",
      "resource_type": "course"
    }
  ]
}

字段说明：
- query：精准搜索词，尽量包含具体内容名称（如课程名、技术名、书名）
  * 编程类：优先搜索官方文档、教程网站（如 "python tutorial site:docs.python.org"）
  * 视频类：加上 "tutorial beginner" 或 "讲解 入门"
  * 练习类：加上 "exercises practice problems"
- purpose：简短说明这个资源的作用，供学习者理解
- learning_phase：input（学新知识）/ practice（练习巩固）/ reference（查阅参考）
- suitable_for：beginner / intermediate / advanced / all
- resource_type：course（课程/视频）/ doc（文档）/ video（视频）/ exercise（练习）/ reference（参考书）

搜索策略原则：
- 优先中文资源，补充英文权威来源
- beginner 阶段多搜 "入门" "tutorial" "基础"
- 确保覆盖 input（2-3个）和 practice（2-3个），可选 reference（1-2个）
- 不同搜索词应有差异，避免重复检索到同一资源`;

// ─── Stage 3: Task Planning ───────────────────────────────────────────────────
// 理论依据：
// - Bloom 认知分类法（Bloom, 1956 / 修订版 Anderson & Krathwohl, 2001）：
//   子任务必须从低认知层级渐进到高层级（记忆→理解→应用→分析）
// - Worked Example Effect（Sweller & Cooper, 1985）：
//   入门阶段先给范例，减少认知负荷，再逐步撤除脚手架
// - 认知负荷理论（Sweller, 1988）：
//   单任务工期限制在 1-5 天，防止工作记忆过载
// - Deep Work（Newport, 2016）：
//   每天专注学习时长约 1.5-3 小时，超出则效率递减

export const PLAN_PROMPT = `你是一名专业学习计划设计师，精通 Bloom 认知分类法、脚手架学习理论和认知负荷理论。
请根据以下信息，为学习者设计一个科学、可执行的学习计划。

学习目标：{GOAL}
正式任务名：{TASK_NAME}
主题领域：{DOMAIN}
学习者基础：{PRIOR_LEVEL}
整体 Bloom 目标层级：{BLOOM_TARGET}（1=记忆→6=创造）
预计总学习时长：{TOTAL_HOURS} 小时
可用资源清单（JSON）：{RESOURCES}
调整要求（如有）：{ADJUSTMENT}

请以 JSON 格式制定学习计划（不要加 markdown 代码块）：

{
  "subtasks": [
    {
      "title": "子任务标题（不超过20字，动宾结构）",
      "description": "具体说明：做什么 + 怎么做 + 用哪个资源（不超过80字）",
      "duration_days": 2,
      "start_day": 0,
      "priority": 1,
      "bloom_level": 2,
      "deep_work_hours": 1.5,
      "learning_method": "worked_example",
      "resource_indices": [0, 2]
    }
  ]
}

子任务设计规则（严格遵守）：

1. 数量：5-8个子任务，beginner基础建议7-8个，advanced可以5-6个

2. Bloom层级渐进（最重要）：
   - 第1-2个子任务：bloom_level 必须为 1 或 2（记忆/理解）
   - 中间子任务：bloom_level 逐步升至 3-4（应用/分析）
   - 最后1-2个子任务：bloom_level 为 3-5，含实践或复盘
   - 相邻子任务 bloom_level 差值不超过 2 级

3. 工期约束（认知负荷理论）：
   - 每个子任务 duration_days 限定为 1-5 天
   - 基础概念类（bloom_level 1-2）：1-2 天
   - 技能练习类（bloom_level 3）：2-3 天
   - 综合应用类（bloom_level 4-5）：3-5 天

4. 学习方法标注（learning_method）：
   - worked_example：先看范例再模仿（适合入门）
   - guided_practice：跟着教程边学边做（适合技能类）
   - independent_practice：独立完成任务（适合巩固）
   - project：完成完整的小产出（适合应用阶段）
   - review：系统复习已学内容（适合阶段总结）

5. 起始日计算：start_day = 前面所有子任务的 duration_days 之和，第一个必须为 0

6. 资源绑定：resource_indices 对应资源清单索引（从0开始），每个子任务至少引用 1 个

7. deep_work_hours：每天需要的深度专注时长（0.5-3小时），认知密集任务建议 1.5-2.5 小时

8. description 写法示例：
   ✅ "在B站搜索'廖雪峰Python教程'，完成第1-3章，手打所有代码示例"
   ❌ "学习基础知识"（太模糊）`;

// ─── Stage 4: Validation ─────────────────────────────────────────────────────
// 五维评分：Bloom连贯性 + 认知负荷 + 可执行性 + 资源覆盖 + 逻辑性

export const VALIDATE_PROMPT = `你是一名教育心理学专家，请基于科学标准审核这个学习计划。

学习目标：{GOAL}
学习者基础：{PRIOR_LEVEL}
学习计划（JSON）：{PLAN}

请以 JSON 格式回复审核结果（不要加 markdown 代码块）：
{
  "pass": true,
  "score": 85,
  "issues": [
    {"type": "bloom_jump", "detail": "第3个子任务bloom_level从2直接跳到5，超出建议范围"},
    {"type": "duration_too_long", "detail": "子任务工期6天对beginner过重，建议拆分"}
  ],
  "suggestions": "若 pass=false，给出具体可操作的修改建议（1-3条）",
  "strengths": "计划的1-2个优点"
}

五维审核标准（每条满分20分）：

① Bloom层级连贯性（20分）
   - 层级是否从低到高渐进？相邻差值是否 ≤ 2？
   - 首个子任务是否为记忆/理解（bloom_level 1-2）？
   - 末个子任务是否含实践/复盘（bloom_level ≥ 3）？

② 认知负荷合理性（20分）
   - 每个子任务 duration_days 是否在 1-5 天内？
   - deep_work_hours 是否不超过 3 小时？
   - 总天数是否在 7-30 天内？

③ 可执行性（20分）
   - description 是否具体到"知道该去哪里、做什么"？
   - 每个子任务是否引用了至少 1 个资源？
   - learning_method 是否与子任务内容匹配？

④ 资源覆盖完整性（20分）
   - 是否覆盖 input + practice 两个阶段？
   - 资源是否适合学习者基础（{PRIOR_LEVEL}）？

⑤ 先后逻辑性（20分）
   - 是否先理论后实践？是否先易后难？
   - 最后是否有总结/输出环节？

通过标准：总分 ≥ 75 且无严重问题（bloom跳跃>2级 或 单任务工期>7天）则 pass=true`;
