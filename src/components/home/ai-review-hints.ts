// ─── AI 修订建议派生（§3 屏一 · 右深色 .ai-dark 卡）─────────────────────
// 全部数值来自 useAnalysisPanel 已拿到的真实任务数据（analyze 缓冲 JSON →
// getTask 水化后的 entry.task），此处只做客户端二次推导，绝不编造指标。

import type { Subtask } from "@/lib/db/schema";
import type { AnalysisEntry, Resource } from "./use-analysis-panel";

export interface PlanSummary {
  subtaskCount: number;
  completedCount: number;
  resourceCount: number;
  verifiedCount: number;
  searchOnlyCount: number;
  totalDays: number;
  /** 深度工时合计（无 deepWorkHours 时按 durationDays × 1.5 估算口径，与旧卡一致） */
  deepHours: number;
}

export interface AiReviewHint {
  id: string;
  title: string;
  body: string;
  /** 关联子任务 id（可跳转到 #subtask-card-{id}） */
  subtaskId?: string;
  /** 一键填入「重新规划」输入框的调整意见 */
  adjustment?: string;
}

function parseResources(sub: Subtask): Resource[] {
  if (!sub.resources) return [];
  try {
    return JSON.parse(sub.resources) as Resource[];
  } catch {
    return [];
  }
}

function trustOf(res: Resource): "verified" | "search_only" {
  const tl = (res as unknown as { trust_level?: string }).trust_level;
  if (tl === "verified") return "verified";
  if (tl === "search_only") return "search_only";
  return res.url ? "verified" : "search_only";
}

/** 计划整体口径的真实统计 */
export function summarizePlan(entry: AnalysisEntry): PlanSummary {
  const subs = entry.task?.subtasks ?? [];
  let resourceCount = 0;
  let verifiedCount = 0;
  let searchOnlyCount = 0;
  let deepHours = 0;
  for (const s of subs) {
    const rs = parseResources(s);
    resourceCount += rs.length;
    for (const r of rs) {
      if (trustOf(r) === "verified") verifiedCount++;
      else searchOnlyCount++;
    }
    deepHours += s.deepWorkHours ? Number(s.deepWorkHours) || 0 : (s.durationDays || 1) * 1.5;
  }
  return {
    subtaskCount: subs.length,
    completedCount: subs.filter((s) => s.completed).length,
    resourceCount,
    verifiedCount,
    searchOnlyCount,
    totalDays: entry.task?.totalDays ?? 0,
    deepHours: Math.round(deepHours * 10) / 10,
  };
}

/**
 * 依据真实计划数据推导修订建议。
 * 每条建议都可回溯到具体子任务或具体资源计数，没有数据就不产出建议。
 */
export function deriveReviewHints(entry: AnalysisEntry): AiReviewHint[] {
  const subs = entry.task?.subtasks ?? [];
  if (subs.length === 0) return [];

  const ordered = [...subs].sort((a, b) => (a.startDay ?? 0) - (b.startDay ?? 0) || a.sortOrder - b.sortOrder);
  const hints: AiReviewHint[] = [];

  // 1) Bloom 认知跨度：相邻两级跳跃 ≥ 2 层时提示（对应 §9 Bloom 渐进约束）
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1];
    const cur = ordered[i];
    const gap = (cur.bloomLevel ?? 1) - (prev.bloomLevel ?? 1);
    if (Math.abs(gap) >= 2) {
      hints.push({
        id: `bloom-gap-${cur.id}`,
        title: `「${cur.title.slice(0, 14)}」认知层级跨度偏大`,
        body: `上一阶为 L${prev.bloomLevel ?? 1} ${prev.title.slice(0, 12)}，本阶直接到 L${cur.bloomLevel ?? 1}，跨度 ${Math.abs(gap)} 级。建议插入中间层级的过渡练习，避免认知过载。`,
        subtaskId: cur.id,
        adjustment: `第 ${i + 1} 阶「${cur.title}」前插入一级过渡子任务，缩小 L${prev.bloomLevel ?? 1} 到 L${cur.bloomLevel ?? 1} 的跨度。`,
      });
      break;
    }
  }

  // 2) 资源可信度：仅检索到搜索页（未通过存活校验）的资源
  const sum = summarizePlan(entry);
  if (sum.searchOnlyCount > 0) {
    hints.push({
      id: "res-search-only",
      title: `${sum.searchOnlyCount} 条资源仅为搜索入口`,
      body: `该计划共 ${sum.resourceCount} 条资源，其中 ${sum.searchOnlyCount} 条没有通过 URL 存活校验，点击后需自行在搜索结果里挑选。可要求只保留权威域名可检索到的资源。`,
      adjustment: "资源只保留官方文档、论文与权威课程，去掉仅给出搜索词的条目。",
    });
  }

  // 3) 死链：三维校验标记为 not_found / dead
  const dead = ordered.reduce((n, s) => {
    const rs = parseResources(s);
    return n + rs.filter((r) => {
      const st = (r as unknown as { url_status?: string }).url_status;
      return st === "not_found" || st === "dead";
    }).length;
  }, 0);
  if (dead > 0) {
    hints.push({
      id: "res-dead-link",
      title: `${dead} 条资源链接已失效`,
      body: `核查阶段探测到 ${dead} 条 404 或无法访问的链接，建议重新检索替代资源后再开始学习。`,
      adjustment: `替换失效的 ${dead} 条资源链接。`,
    });
  }

  // 4) 日均深度工时负载：超过 4 小时/天视为不可持续
  if (sum.totalDays > 0 && sum.deepHours > 0) {
    const perDay = sum.deepHours / sum.totalDays;
    if (perDay > 4) {
      hints.push({
        id: "daily-load",
        title: `日均深度工时 ${perDay.toFixed(1)} 小时，高于可持续阈值`,
        body: `${sum.totalDays} 天里排了 ${sum.deepHours} 小时深度工作。自主学习者建议每日不超过 4 小时，可拉长排期或砍掉低层级子任务。`,
        adjustment: "降低整体强度：每日深度工作控制在 4 小时以内，可适当拉长总排期。",
      });
    }
  }

  return hints;
}

export { parseResources as parseSubtaskResources };
