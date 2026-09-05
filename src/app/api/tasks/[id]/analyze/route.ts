import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { rateLimit, acquireLock } from "@/lib/rate-limit";
import { appAi } from "@/lib/eazo-ai-billing";
import { resolveResources, type SearchIntent, type TrustableResource } from "@/lib/tavily";
import { validateResources } from "@/lib/resource-validator";
import { extractUrl, fetchUrlContent, formatContentForPrompt } from "@/lib/url-fetcher";
import {
  INTENT_PROMPT,
  RESOURCE_INTENT_PROMPT,
  PLAN_PROMPT,
  VALIDATE_PROMPT,
} from "@/lib/ai/prompts";
import {
  getTaskById,
  createSubtasks,
  updateTaskTotalDays,
  updateTaskStatus,
  updateTaskTitleAndRawInput,
  updateTaskStartDate,
  getScheduledTasksByUser,
} from "@/lib/db/queries";
import {
  computeNewTaskStartDate,
  todayMidnight,
  registerDailySlot,
  findNextAvailableDay,
  validateBloomSequence,
  suggestReviewNodes,
  type ScheduledTask,
  type BloomLevel,
  type DailySlot,
} from "@/lib/scheduler";

// ─── Resource type（使用 TrustableResource，含 trust_level）────────────────
// TrustableResource 从 src/lib/tavily.ts 导入，不在此重复定义

// ─── AI Prompts 定义见 src/lib/ai/prompts.ts ─────────────

// ─── Stage 1: Intent Analysis ──────────────────────────────────────────
// (Prompt 定义已移至 src/lib/ai/prompts.ts，此处保留注释说明理论依据)
// - Vygotsky ZPD 理论：先评估先备知识，才能设定合适的学习起点
// - Bloom 认知分类法：明确最终目标层级，反向设计学习路径

// ─── Stage 2: Resource Search Intent ──────────────────────────────────
// 两阶段分离：AI 只生成搜索意图（无 URL），代码负责实际检索

// ─── Stage 3 & 4 Prompts 见 src/lib/ai/prompts.ts ───────────────────

// ─── Helpers ─────────────────────────────────────────────────────────

async function callAI(
  systemPrompt: string,
  userMessage: string,
  onDelta?: (delta: string) => void
): Promise<string> {
  const stream = await appAi.chat({
    model: process.env.EAZO_AI_MODEL_KEY || "deepseek.v3.2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
    // Reasoning models (e.g. deepseek-v4-flash) spend token budget on
    // reasoning_content first, then populate content. 2500 was too low —
    // the model exhausted tokens on reasoning and never produced content.
    // Make configurable; default 8000 covers reasoning + JSON output.
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 8000,
  });

  let accumulated = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content ?? "";
    if (delta) {
      accumulated += delta;
      onDelta?.(delta);
    }
  }
  return accumulated;
}

function parseJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

// ─── Main Route ───────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  // 限流：昂贵 AI 端点，每用户每分钟最多 10 次，防刷量放大成本
  const rl = rateLimit(`analyze:${auth.user.id}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { id } = await params;
  const task = await getTaskById(id);
  if (!task || task.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // In-flight 锁：分析耗时数十秒且会批量写子任务，并发/重复触发同一 task
  // 会插入多套重复子任务。用按 taskId 的单飞锁拒绝并发分析。
  const releaseLock = acquireLock(`analyze:task:${id}`, 180_000);
  if (!releaseLock) {
    return NextResponse.json(
      { error: "该任务正在分析中，请稍候" },
      { status: 409 }
    );
  }

  let adjustment = "";
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    // 限长：adjustment 会拼进 AI prompt，限制长度防止 token 成本放大
    if (typeof body.adjustment === "string") adjustment = body.adjustment.trim().slice(0, 1000);
  } catch { /* ignore */ }

  const rawGoal = task.rawInput || task.title;

  try {
    // ── Stage 0: URL 内容抓取（如果输入包含 URL）───────────────
    let urlContext = "";
    const detectedUrl = extractUrl(rawGoal);
    if (detectedUrl) {
      try {
        const fetched = await fetchUrlContent(detectedUrl);
        if (fetched) {
          urlContext = formatContentForPrompt(fetched);
        }
      } catch { /* 抓取失败静默降级，不阻断主流程 */ }
    }

    // ── Stage 1: Intent ───────────────────────────────────────────
    const enrichedGoal = urlContext
      ? `${rawGoal}\n\n${urlContext}`
      : rawGoal;

    const intentRaw = await callAI(
      INTENT_PROMPT,
      enrichedGoal + (adjustment ? `\n调整要求：${adjustment}` : ""),
      undefined,
    );

    interface IntentResult {
      task_name?: string;
      topic_category?: string;
      urgency?: number;
      importance?: number;
      prior_knowledge_level?: string;
      learning_goal_type?: string;
      bloom_target_level?: number;
      estimated_total_hours?: number;
      search_keywords?: string[];
      subject_domain?: string;
    }
    const intent = parseJson<IntentResult>(intentRaw);
    const taskName = intent?.task_name?.trim() || task.title;
    const domain = intent?.subject_domain || rawGoal;
    const keywords = intent?.search_keywords?.join("、") || rawGoal;
    const topicCategory = intent?.topic_category || "其他";
    const urgencyScore = intent?.urgency ?? 3;
    const importanceScore = intent?.importance ?? 3;
    const keywordsArr = intent?.search_keywords ?? [];
    const priorLevel = intent?.prior_knowledge_level || "beginner";
    const bloomTarget = intent?.bloom_target_level ?? 3;
    const estimatedHours = intent?.estimated_total_hours ?? 20;

    // ── Stage 2: Resources（两阶段分离）──────────────────────────
    const intentRawStr = await callAI(
      "你是资深学习资源顾问，请以 JSON 格式精确回复，不要加 markdown 代码块。严禁生成任何 URL。",
      RESOURCE_INTENT_PROMPT
        .replace("{GOAL}", enrichedGoal.slice(0, 800))
        .replace("{DOMAIN}", domain)
        .replace(/{PRIOR_LEVEL}/g, priorLevel)
        .replace("{KEYWORDS}", keywords),
      undefined,
    );

    interface IntentListResult { search_intents?: SearchIntent[] }
    const intentList = parseJson<IntentListResult>(intentRawStr)?.search_intents ?? [];

    const resources: TrustableResource[] = await resolveResources(intentList, topicCategory);
    await validateResources(resources);

    const verifiedCount = resources.filter((r) => r.trust_level === "verified").length;
    const reachableCount = resources.filter((r) => r.url_status === "ok" || r.url_status === "redirect").length;

    // ── Stage 3: Plan ─────────────────────────────────────────────
    const planRaw = await callAI(
      "你是学习计划设计专家，精通Bloom认知分类法和认知负荷理论，请以 JSON 格式精确回复，不要加 markdown 代码块。",
      PLAN_PROMPT
        .replace("{GOAL}", enrichedGoal.slice(0, 1200))
        .replace("{TASK_NAME}", taskName)
        .replace("{DOMAIN}", domain)
        .replace(/{PRIOR_LEVEL}/g, priorLevel)
        .replace("{BLOOM_TARGET}", String(bloomTarget))
        .replace("{TOTAL_HOURS}", String(estimatedHours))
        .replace("{RESOURCES}", JSON.stringify(resources.map((r, i) => ({ index: i, ...r }))))
        .replace("{ADJUSTMENT}", adjustment || "无"),
      undefined,
    );

    interface PlanSubtask {
      title: string;
      description: string;
      duration_days: number;
      start_day: number;
      priority?: number;
      bloom_level?: number;
      deep_work_hours?: number;
      learning_method?: string;
      resource_indices?: number[];
    }
    interface PlanResult { subtasks?: PlanSubtask[] }
    const plan = parseJson<PlanResult>(planRaw);
    if (!plan?.subtasks?.length) throw new Error("AI 未生成有效计划");

    // ── Stage 4: Validate ─────────────────────────────────────────
    const validateRaw = await callAI(
      "你是教育心理学专家，请以 JSON 格式精确回复，不要加 markdown 代码块。",
      VALIDATE_PROMPT
        .replace("{GOAL}", rawGoal)
        .replace(/{PRIOR_LEVEL}/g, priorLevel)
        .replace("{PLAN}", JSON.stringify(plan.subtasks))
    );

    interface ValidateResult { pass?: boolean; score?: number; suggestions?: string }
    const validation = parseJson<ValidateResult>(validateRaw);

    const bloomLevels = plan.subtasks
      .map((s) => (s.bloom_level ?? 2) as BloomLevel)
      .filter((l) => l >= 1 && l <= 6);
    const bloomOk = validateBloomSequence(bloomLevels);

    let finalPlan = plan;
    const needsRevision =
      (validation?.pass === false && !!validation?.suggestions) || !bloomOk;

    if (needsRevision) {
      const revisionNote = !bloomOk
        ? "Bloom层级跳跃：请确保层级从1-2渐进到3-4，相邻差不超过2级。"
        : (validation?.suggestions ?? "");

      const revisedRaw = await callAI(
        "你是学习计划设计专家，精通Bloom认知分类法，请以 JSON 格式精确回复，不要加 markdown 代码块。",
        PLAN_PROMPT
          .replace("{GOAL}", rawGoal)
          .replace("{TASK_NAME}", taskName)
          .replace("{DOMAIN}", domain)
          .replace(/{PRIOR_LEVEL}/g, priorLevel)
          .replace("{BLOOM_TARGET}", String(bloomTarget))
          .replace("{TOTAL_HOURS}", String(estimatedHours))
          .replace("{RESOURCES}", JSON.stringify(resources.map((r, i) => ({ index: i, ...r }))))
          .replace("{ADJUSTMENT}", adjustment || "无")
        + `\n\n审核意见（请按此修正）：${revisionNote}`,
        undefined,
      );
      const revised = parseJson<PlanResult>(revisedRaw);
      if (revised?.subtasks?.length) finalPlan = revised;
    }

    // ── DB Write + 交错排期 ───────────────────────────────────────
    const rawInput = task.rawInput || task.title;
    await updateTaskTitleAndRawInput(id, taskName, rawInput);

    const existingSchedule = await getScheduledTasksByUser(auth.user.id);
    const today = todayMidnight();
    const otherTasks: ScheduledTask[] = existingSchedule
      .filter((t) => t.taskId !== id && t.status !== "done" && t.startDate != null)
      .map((t) => ({
        taskId: t.taskId,
        startDate: t.startDate!,
        totalDays: Math.max(t.totalDays, 1),
        priorityScore: 3,
        topicCategory,
        createdAt: t.createdAt,
      }));

    const newStartDate = computeNewTaskStartDate(otherTasks, today);
    await updateTaskStartDate(id, newStartDate);

    const sorted = [...finalPlan.subtasks!].sort((a, b) => {
      const bloomA = a.bloom_level ?? 2;
      const bloomB = b.bloom_level ?? 2;
      if (bloomA !== bloomB) return bloomA - bloomB;
      return (a.priority ?? 3) - (b.priority ?? 3);
    });

    const dailySlots = new Map<string, DailySlot>();
    let cumulativeDay = 0;

    const subtaskItems = sorted.map((s, i) => {
      const earliestDate = new Date(newStartDate);
      earliestDate.setDate(newStartDate.getDate() + cumulativeDay);

      const actualDate = findNextAvailableDay(earliestDate, topicCategory, dailySlots, s.bloom_level ?? 2);
      const actualStartDay = Math.round(
        (actualDate.getTime() - newStartDate.getTime()) / 86400000
      );

      registerDailySlot(actualDate.toISOString().slice(0, 10), topicCategory, dailySlots, s.bloom_level ?? 2);
      cumulativeDay = actualStartDay + s.duration_days;

      const subtaskResources: TrustableResource[] = (s.resource_indices ?? [])
        .map((idx: number) => resources[idx])
        .filter(Boolean);

      return {
        title: s.title,
        description: s.description,
        durationDays: Math.min(Math.max(s.duration_days, 1), 7),
        startDay: actualStartDay,
        sortOrder: i,
        resources: subtaskResources.length > 0 ? JSON.stringify(subtaskResources) : null,
        topic: topicCategory,
        urgency: urgencyScore,
        importance: importanceScore,
        keywords: keywordsArr.length > 0 ? JSON.stringify(keywordsArr) : null,
      };
    });

    const reviewNodes = suggestReviewNodes(
      subtaskItems.map((s) => ({ startDay: s.startDay, durationDays: s.durationDays }))
    );

    const saved = await createSubtasks(id, subtaskItems);
    const totalDays = saved.reduce(
      (max, s) => Math.max(max, s.startDay + s.durationDays), 0
    );
    await updateTaskTotalDays(id, totalDays);
    await updateTaskStatus(id, "done");

    return NextResponse.json({
      ok: true,
      result: {
        subtasks: saved,
        totalDays,
        taskName,
        rawInput,
        startDate: newStartDate.toISOString(),
        topicCategory,
        priorLevel,
        bloomTarget,
        reviewNodes,
        verifiedCount,
        reachableCount,
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error("[AutoTask] analyze pipeline error:", errMsg, errStack);
    // Surface the real error in the response for diagnosis (self-hosted, no PII).
    return NextResponse.json(
      { ok: false, error: "分析未能完成，请稍后重试", debug: errMsg },
      { status: 500 },
    );
  } finally {
    releaseLock(); // 释放 in-flight 锁
  }
}

